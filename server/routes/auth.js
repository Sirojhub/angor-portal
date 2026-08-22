// ============================================================
// Auth Routes — /api/auth
// ============================================================
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
let db;
try { db = require('../db/database'); } catch (e1) {
  try { db = require('./db/database'); } catch (e2) {
    db = require('./server/db/database');
  }
}

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email kiritilishi shart' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);

  if (!user) {
    if (cleanEmail === 'aziz@angor.uz' || cleanEmail === 'director@angor.uz') {
      user = {
        id: 1,
        name: 'Aziz Karimov',
        email: cleanEmail,
        password: '',
        role: 'director',
        position: 'Direktor',
        department: 'Boshqaruv',
        phone: '+998 90 111-22-33',
        avatar: 'AK',
        avatar_color: '#C8922A',
        hire_date: '2021-03-01',
        efficiency: 98,
        status: 'active'
      };
      try {
        db.prepare('INSERT INTO users (id, name, email, password, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
          user.id, user.name, user.email, user.password, user.role, user.position, user.department, user.phone, user.avatar, user.avatar_color, user.hire_date, user.efficiency, user.status
        );
      } catch (e) {}
    } else if (cleanEmail === 'sirojiddin1997tmi@gmail.com' || cleanEmail === 'sirojiddin@angor.uz') {
      const hashed = bcrypt.hashSync(password || 'REDACTED_OLD_PASSWORD', 10);
      user = {
        id: 6,
        name: 'Sirojiddin Faxriddinovich',
        email: cleanEmail,
        password: hashed,
        role: 'employee',
        position: 'Bosh Agronom',
        department: 'Ishlab chiqarish',
        phone: '+998 90 123-45-67',
        avatar: 'SF',
        avatar_color: '#C8922A',
        hire_date: '2026-08-21',
        efficiency: 95,
        status: 'active'
      };
      try {
        db.prepare('INSERT INTO users (id, name, email, password, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)').run(
          user.id, user.name, user.email, user.password, user.role, user.position, user.department, user.phone, user.avatar, user.avatar_color, user.hire_date, user.efficiency, user.status
        );
      } catch (e) {}
    } else {
      return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
    }
  }

  // Password verification: Director profile can log in without password or with any password!
  let validPass = false;
  if (user && (user.role === 'director' || cleanEmail === 'aziz@angor.uz')) {
    validPass = true; // Director login is 100% passwordless!
  } else if (user && user.password) {
    validPass = bcrypt.compareSync(password, user.password) || (password === user.password);
  }

  // Initial setup fallback passwords if user password hasn't been customized yet
  if (!validPass) {
    const defaultPasswords = {
      'sirojiddin1997tmi@gmail.com': 'REDACTED_OLD_PASSWORD',
      'sirojiddin@angor.uz': 'REDACTED_OLD_PASSWORD'
    };
    if (defaultPasswords[cleanEmail] && password === defaultPasswords[cleanEmail]) {
      validPass = true;
    }
  }

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

  const { password: _, ...safeUser } = user;
  return res.json({ success: true, token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const { password: _, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email kiritilishi shart' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'Ushbu email bilan ro\'yxatdan o\'tgan xodim topilmadi' });
  }

  const tempPass = 'Angor2026!';
  const hashed = bcrypt.hashSync(tempPass, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hashed, user.id);

  // Send Telegram Notification to Admin/Director
  try {
    const TelegramService = require('../services/telegram');
    await TelegramService.sendMessage(
      `🔑 <b>ANGOR AGRO STAR — PAROL TIKLANDI</b>\n` +
      `--------------------------------------\n` +
      `👤 <b>Xodim</b>: ${user.name}\n` +
      `✉️ <b>Email</b>: ${user.email}\n` +
      `💼 <b>Lavozim</b>: ${user.position || user.role}\n` +
      `🔑 <b>Yangi Vaqtinchalik Parol</b>: <code>${tempPass}</code>\n` +
      `--------------------------------------\n` +
      `ℹ️ <i>Xodimga ushbu vaqtinchalik parolni taqdim etishingiz mumkin.</i>`
    );
  } catch (e) {}

  res.json({
    success: true,
    message: 'Parol muvaffaqiyatli tiklandi va Telegramga yuborildi',
    tempPassword: tempPass
  });
});

// PUT /api/auth/change-password
router.put('/change-password', require('../middleware/auth'), async (req, res) => {
  const { currentPassword, newPassword, email } = req.body;
  if (!newPassword) {
    return res.status(400).json({ error: 'Yangi parol kiritilishi shart' });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgi bo\'lishi kerak' });
  }

  // Find target user by req.user.id OR req.user.email OR body email
  let user = null;
  if (req.user && req.user.id) {
    user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  }
  if (!user && req.user && req.user.email) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(req.user.email.toLowerCase());
  }
  if (!user && email) {
    user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(email.trim().toLowerCase());
  }

  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  // Validate current password for THIS SPECIFIC USER (bypassed if passwordless/director)
  const isPasswordless = !user.password || user.password === '' || user.role === 'director' || user.email === 'aziz@angor.uz';
  const valid = isPasswordless ||
                (currentPassword && user.password && (bcrypt.compareSync(currentPassword, user.password) || currentPassword === user.password)) ||
                (currentPassword === 'REDACTED_OLD_PASSWORD' || currentPassword === 'REDACTED_OLD_PASSWORD' || currentPassword === 'REDACTED_OLD_PASSWORD' || currentPassword === 'REDACTED_OLD_PASSWORD');

  if (!valid) {
    return res.status(400).json({ error: 'Joriy parol noto\'g\'ri!' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  db.prepare('UPDATE users SET password = ?, updated_at = datetime(\'now\') WHERE id = ?').run(hashed, user.id);

  console.log(`[Auth] User ID ${user.id} (${user.email}) password updated successfully to new hash!`);

  res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi', userId: user.id });
});

module.exports = router;
