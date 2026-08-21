// ============================================================
// Auth Routes — /api/auth
// ============================================================
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db/database');

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email va parol kiritilishi shart' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);

  if (!user) {
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
  }

  const validPass = (password === user.password) || bcrypt.compareSync(password, user.password);
  if (!validPass) {
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Foydalanuvchi bloklangan' });
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || 'REDACTED_OLD_JWT_SECRET',
    { expiresIn: process.env.JWT_EXPIRES || '8h' }
  );

  // Parolni javobdan olib tashlash
  const { password: _, ...safeUser } = user;

  res.json({
    success: true,
    token,
    user: safeUser
  });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

module.exports = router;
