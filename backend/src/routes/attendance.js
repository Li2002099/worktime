const express = require('express');
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { getTWDate, calcWorkHours, calcOvertimeHours } = require('../utils/timeUtils');

const router = express.Router();

// POST /api/attendance/clock-in
router.post('/clock-in', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTWDate();
    const now = new Date().toISOString();

    const { rows } = await pool.query(
      'SELECT * FROM attendance_records WHERE user_id = $1 AND work_date = $2',
      [userId, today]
    );
    const existing = rows[0];

    if (existing?.clock_in) {
      return res.status(400).json({ message: '今日已完成上班打卡' });
    }

    if (existing) {
      await pool.query(
        'UPDATE attendance_records SET clock_in = $1, updated_at = NOW() WHERE user_id = $2 AND work_date = $3',
        [now, userId, today]
      );
    } else {
      await pool.query(
        'INSERT INTO attendance_records (user_id, work_date, clock_in) VALUES ($1, $2, $3)',
        [userId, today, now]
      );
    }

    res.json({ message: '上班打卡成功', clock_in: now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// POST /api/attendance/clock-out
router.post('/clock-out', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTWDate();
    const now = new Date().toISOString();
    const { note } = req.body;

    const { rows } = await pool.query(
      'SELECT * FROM attendance_records WHERE user_id = $1 AND work_date = $2',
      [userId, today]
    );
    const record = rows[0];

    if (!record?.clock_in) {
      return res.status(400).json({ message: '尚未完成上班打卡，無法打下班卡' });
    }
    if (record.clock_out) {
      return res.status(400).json({ message: '今日已完成下班打卡' });
    }
    if (new Date(now) <= new Date(record.clock_in)) {
      return res.status(400).json({ message: '下班時間不可早於或等於上班時間' });
    }

    const workHours = calcWorkHours(record.clock_in, now);
    const overtimeHours = calcOvertimeHours(workHours);

    await pool.query(
      `UPDATE attendance_records
       SET clock_out = $1, note = $2, work_hours = $3, overtime_hours = $4, updated_at = NOW()
       WHERE user_id = $5 AND work_date = $6`,
      [now, note || null, workHours, overtimeHours, userId, today]
    );

    res.json({ message: '下班打卡成功', clock_out: now, work_hours: workHours, overtime_hours: overtimeHours });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// GET /api/attendance/today
router.get('/today', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTWDate();

    const { rows } = await pool.query(
      'SELECT * FROM attendance_records WHERE user_id = $1 AND work_date = $2',
      [userId, today]
    );
    const record = rows[0];

    res.json({
      date:           today,
      clock_in:       record?.clock_in  || null,
      clock_out:      record?.clock_out || null,
      note:           record?.note      || '',
      work_hours:     record?.work_hours     || 0,
      overtime_hours: record?.overtime_hours || 0,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// PATCH /api/attendance/today/note
router.patch('/today/note', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const today = getTWDate();
    const { note } = req.body;

    const { rows } = await pool.query(
      'SELECT id FROM attendance_records WHERE user_id = $1 AND work_date = $2',
      [userId, today]
    );

    if (!rows[0]) {
      return res.status(404).json({ message: '今日尚無打卡紀錄，請先完成上班打卡' });
    }

    await pool.query(
      'UPDATE attendance_records SET note = $1, updated_at = NOW() WHERE user_id = $2 AND work_date = $3',
      [note || null, userId, today]
    );

    res.json({ message: '備註已更新' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// GET /api/attendance/me?month=YYYY-MM
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { month } = req.query;

    const { rows } = month
      ? await pool.query(
          "SELECT * FROM attendance_records WHERE user_id = $1 AND work_date LIKE $2 ORDER BY work_date DESC",
          [userId, `${month}%`]
        )
      : await pool.query(
          'SELECT * FROM attendance_records WHERE user_id = $1 ORDER BY work_date DESC LIMIT 60',
          [userId]
        );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// GET /api/attendance/me/monthly?month=YYYY-MM
router.get('/me/monthly', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const month = req.query.month || getTWDate().slice(0, 7);

    const { rows } = await pool.query(
      `SELECT
         COALESCE(SUM(work_hours), 0)     AS total_work_hours,
         COALESCE(SUM(overtime_hours), 0) AS total_overtime_hours,
         COUNT(id)                        AS days_worked
       FROM attendance_records
       WHERE user_id = $1 AND work_date LIKE $2 AND clock_out IS NOT NULL`,
      [userId, `${month}%`]
    );

    const r = rows[0];
    res.json({
      month,
      total_work_hours:     parseInt(r.total_work_hours),
      total_overtime_hours: parseInt(r.total_overtime_hours),
      days_worked:          parseInt(r.days_worked),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

module.exports = router;
