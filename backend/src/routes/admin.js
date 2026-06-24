const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const { getTWDate } = require('../utils/timeUtils');

const router = express.Router();

router.use(authenticateToken, adminOnly);

// GET /api/admin/summary?month=YYYY-MM
router.get('/summary', async (req, res) => {
  try {
    const month = req.query.month || getTWDate().slice(0, 7);

    const { rows } = await pool.query(
      `SELECT
         u.id, u.username, u.name,
         COALESCE(SUM(CASE WHEN a.clock_out IS NOT NULL THEN a.work_hours     ELSE 0 END), 0) AS total_work_hours,
         COALESCE(SUM(CASE WHEN a.clock_out IS NOT NULL THEN a.overtime_hours ELSE 0 END), 0) AS total_overtime_hours,
         COUNT(a.id) AS days_checked_in,
         COALESCE(SUM(CASE WHEN a.clock_in IS NOT NULL AND a.clock_out IS NULL THEN 1 ELSE 0 END), 0) AS incomplete_days
       FROM users u
       LEFT JOIN attendance_records a ON a.user_id = u.id AND a.work_date LIKE $1
       WHERE u.role = 'user'
       GROUP BY u.id
       ORDER BY u.name`,
      [`${month}%`]
    );

    res.json({ month, users: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// GET /api/admin/attendance?month=YYYY-MM
router.get('/attendance', async (req, res) => {
  try {
    const month = req.query.month || getTWDate().slice(0, 7);

    const { rows } = await pool.query(
      `SELECT a.*, u.name, u.username
       FROM attendance_records a
       JOIN users u ON u.id = a.user_id
       WHERE a.work_date LIKE $1
       ORDER BY a.work_date DESC, u.name`,
      [`${month}%`]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// GET /api/admin/attendance/user/:userId?month=YYYY-MM
router.get('/attendance/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const month = req.query.month || getTWDate().slice(0, 7);

    const { rows: userRows } = await pool.query(
      'SELECT id, username, name, role FROM users WHERE id = $1',
      [userId]
    );

    if (!userRows[0]) {
      return res.status(404).json({ message: '找不到此使用者' });
    }

    const { rows: records } = await pool.query(
      `SELECT * FROM attendance_records
       WHERE user_id = $1 AND work_date LIKE $2
       ORDER BY work_date DESC`,
      [userId, `${month}%`]
    );

    res.json({ user: userRows[0], month, records });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// PUT /api/admin/attendance/:recordId — admin 修改任意紀錄，以 admin 為主
router.put('/attendance/:recordId', async (req, res) => {
  try {
    const { recordId } = req.params;
    const { work_date, clock_in, clock_out, work_hours, overtime_hours, note } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM attendance_records WHERE id = $1',
      [recordId]
    );
    const record = rows[0];

    if (!record) {
      return res.status(404).json({ message: '找不到此打卡紀錄' });
    }

    // 若修改日期，以 admin 為主，刪除同員工該日期的舊紀錄（避免 UNIQUE 衝突）
    if (work_date && work_date !== record.work_date) {
      await pool.query(
        'DELETE FROM attendance_records WHERE user_id = $1 AND work_date = $2 AND id != $3',
        [record.user_id, work_date, recordId]
      );
    }

    if (clock_in && clock_out && new Date(clock_out) <= new Date(clock_in)) {
      return res.status(400).json({ message: '下班時間不可早於或等於上班時間' });
    }

    await pool.query(
      `UPDATE attendance_records
       SET work_date = $1, clock_in = $2, clock_out = $3, note = $4,
           work_hours = $5, overtime_hours = $6, updated_at = NOW()
       WHERE id = $7`,
      [
        work_date      ?? record.work_date,
        clock_in       ?? null,
        clock_out      ?? null,
        note           ?? null,
        work_hours     != null ? parseInt(work_hours)     : record.work_hours,
        overtime_hours != null ? parseInt(overtime_hours) : record.overtime_hours,
        recordId,
      ]
    );

    res.json({ message: '紀錄已更新' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

module.exports = router;
