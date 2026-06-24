const express = require('express');
const jwt = require('jsonwebtoken');
const pool = require('../config/database');
const authenticateToken = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username?.trim()) {
      return res.status(400).json({ message: '請輸入帳號' });
    }

    const { rows } = await pool.query(
      'SELECT id, username, name, role FROM users WHERE username = $1',
      [username.trim().toLowerCase()]
    );

    const user = rows[0];
    if (!user) {
      return res.status(401).json({ message: '找不到此帳號，請確認帳號是否正確' });
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '8h' });
    res.json({ token, user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: '伺服器錯誤' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  res.json({ message: '已登出' });
});

// GET /api/auth/me
router.get('/me', authenticateToken, (req, res) => {
  res.json(req.user);
});

module.exports = router;
