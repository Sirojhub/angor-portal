// ============================================================
// Auth Routes — /api/auth (Secured with Rate Limiting & RBAC)
// ============================================================
require('dotenv').config();
const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('[CRITICAL] JWT_SECRET environment variable is not defined in .env!');
  throw new Error('JWT_SECRET muhit o\'zgaruvchisi (.env) sozlanmagan!');
}

let db;
try { db = require('../db/database'); } catch (e1) {
  try { db = require('./db/database'); } catch (e2) {
    db = require('./server/db/database');
  }
}

// In-Memory Rate Limiting Stores
const loginAttempts = new Map(); // key: ip_email, val: { count, lockUntil, lastAttempt }
const resetAttempts = new Map(); // key: ip_email, val: { count, lockUntil, lastAttempt }

// Clean up expired locks periodically
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginAttempts.entries()) {
    if (v.lockUntil < now && now - v.lastAttempt > 15 * 60 * 1000) loginAttempts.delete(k);
  }
  for (const [k, v] of resetAttempts.entries()) {
    if (v.lockUntil < now && now - v.lastAttempt > 15 * 60 * 1000) resetAttempts.delete(k);
  }
}, 5 * 60 * 1000);

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email kiritilishi shart' });
  }

  const cleanEmail = (email || '').trim().toLowerCase();
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const rateKey = `${ip}_${cleanEmail}`;
  const now = Date.now();

  // Task 8: Brute-force rate limiting check (5 attempts max / 15 mins)
  const attemptRecord = loginAttempts.get(rateKey) || { count: 0, lockUntil: 0, lastAttempt: now };
  if (attemptRecord.lockUntil > now) {
    const minutesLeft = Math.ceil((attemptRecord.lockUntil - now) / (60 * 1000));
    return res.status(429).json({
      error: `Juda ko'p xato urinishlar! Tizim 15 daqiqaga bloklandi. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`
    });
  }

  let user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);

  if (!user) {
    attemptRecord.count = (attemptRecord.count || 0) + 1;
    attemptRecord.lastAttempt = now;
    if (attemptRecord.count >= 5) attemptRecord.lockUntil = now + 15 * 60 * 1000;
    loginAttempts.set(rateKey, attemptRecord);
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
  }

  // XAVFSIZLIK: Parolni faqat bcrypt orqali tekshirish (plain-text taqqoslash qat'iyan taqiqlangan)
  let validPass = false;
  if (user && user.password) {
    validPass = bcrypt.compareSync(password || '', user.password);
  }

  if (!validPass) {
    attemptRecord.count = (attemptRecord.count || 0) + 1;
    attemptRecord.lastAttempt = now;
    if (attemptRecord.count >= 5) attemptRecord.lockUntil = now + 15 * 60 * 1000;
    loginAttempts.set(rateKey, attemptRecord);
    return res.status(401).json({ error: 'Login yoki parol noto\'g\'ri' });
  }

  if (user.status !== 'active') {
    return res.status(403).json({ error: 'Foydalanuvchi bloklangan' });
  }

  // Successful login — reset rate-limit counter
  loginAttempts.delete(rateKey);

  const token = jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES || '8h' }
  );

  const { password: _, reset_code: __, reset_expires: ___, ...safeUser } = user;
  return res.json({ success: true, token, user: safeUser });
});

// GET /api/auth/me
router.get('/me', require('../middleware/auth'), (req, res) => {
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
  const { password: _, reset_code: __, reset_expires: ___, ...safeUser } = user;
  res.json(safeUser);
});

// POST /api/auth/reset-password (Task 3: Rate limited, 10-min single-use code sent to contact)
router.post('/reset-password', async (req, res) => {
  const { email } = req.body;
  console.log('[Auth] POST /api/auth/reset-password so\'rovi keldi. Email:', email);

  if (!email) {
    console.warn('[Auth] Reset password rad etildi: Email kiritilmagan.');
    return res.status(400).json({ error: 'Email kiritilishi shart' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const rateKey = `${ip}_${cleanEmail}`;
  const now = Date.now();

  // Task 3 Rate-limiting check: max 3 reset requests per 15 minutes
  const rRecord = resetAttempts.get(rateKey) || { count: 0, lockUntil: 0, lastAttempt: now };
  if (rRecord.lockUntil > now) {
    const minutesLeft = Math.ceil((rRecord.lockUntil - now) / (60 * 1000));
    console.warn(`[Auth] Rate limit oshib ketdi. IP/Email: ${rateKey}, daqiqa qoldi: ${minutesLeft}`);
    return res.status(429).json({
      error: `Parolni tiklash bo'yicha juda ko'p so'rov berildi. ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`
    });
  }

  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);
  if (!user) {
    rRecord.count = (rRecord.count || 0) + 1;
    rRecord.lastAttempt = now;
    if (rRecord.count >= 3) rRecord.lockUntil = now + 15 * 60 * 1000;
    resetAttempts.set(rateKey, rRecord);
    console.warn(`[Auth] Foydalanuvchi topilmadi. Email: ${cleanEmail}`);
    return res.status(404).json({ error: 'Ushbu email bilan ro\'yxatdan o\'tgan xodim topilmadi' });
  }

  // Generate single-use 6-digit OTP code valid for 10 minutes
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = now + 10 * 60 * 1000; // 10 minutes from now

  user.reset_code = otpCode;
  user.reset_expires = expiresAt;
  user.reset_used = false;

  try { db.save(); } catch (e) {}

  rRecord.count = (rRecord.count || 0) + 1;
  rRecord.lastAttempt = now;
  if (rRecord.count >= 3) rRecord.lockUntil = now + 15 * 60 * 1000;
  resetAttempts.set(rateKey, rRecord);

  const EmailService = require('../services/email');
  const TelegramService = require('../services/telegram');

  // Email orqali yuborish
  let emailResult = { ok: false, error: 'Bajarilmadi' };
  try {
    emailResult = await EmailService.sendResetCodeEmail(user.email, user.name, otpCode);
    if (!emailResult.ok) {
      console.error(`[Auth] EmailService yuborishda muammo:`, emailResult.error);
    }
  } catch (err) {
    console.error(`[Auth] EmailService kutilmagan try/catch xatosi:`, err);
    emailResult = { ok: false, error: err.message };
  }

  // Telegram orqali — FAQAT shu foydalanuvchining O'Z chat ID'siga (global admin kanaliga emas!)
  let telegramResult = { ok: false };
  const userChatId = user.telegram_chat_id || user.chat_id;
  if (userChatId) {
    try {
      telegramResult = await TelegramService.sendMessage(
        `🔑 <b>ANGOR AGRO STAR — PAROL TIKLASH KODI</b>\n` +
        `--------------------------------------\n` +
        `🔐 <b>Bir martalik tasdiqlash kodi</b>: <code>${otpCode}</code>\n` +
        `⏱️ <b>Amal qilish muddati</b>: 10 daqiqa`,
        null,
        userChatId
      );
    } catch (err) {
      console.error(`[Auth] TelegramService send xatosi:`, err.message);
    }
  } else {
    console.log(`[Auth] Foydalanuvchining shaxsiy Telegram Chat ID'si yo'q. User ID: ${user.id}`);
  }

  const channels = [];
  if (emailResult.ok) channels.push('Email');
  if (telegramResult.ok) channels.push('Telegram');

  if (channels.length === 0) {
    console.error(`[Auth] Kod hech qaysi kanal orqali yuborilmadi! Email xatosi: ${emailResult.error || 'Noma\'lum'}`);
    return res.status(500).json({
      error: `Kod yuborib bo'lmadi (${emailResult.error || 'SMTP sozlamalarini tekshiring'}). Administratorga murojaat qiling.`
    });
  }

  console.log(`[Auth] Reset kodi muvaffaqiyatli yuborildi. Kanallar: ${channels.join(', ')}`);
  res.json({
    success: true,
    message: `Tasdiqlash kodi ${channels.join(' va ')} orqali yuborildi. Kod 10 daqiqa amal qiladi.`
  });
});

// POST /api/auth/verify-reset-code (Task 3: Verify OTP code & set new password)
router.post('/verify-reset-code', async (req, res) => {
  const { email, code, newPassword } = req.body;
  if (!email || !code || !newPassword) {
    return res.status(400).json({ error: 'Email, tasdiqlash kodi va yangi parol kiritilishi shart' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Yangi parol kamida 6 ta belgi bo\'lishi kerak' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE LOWER(email) = LOWER(?)').get(cleanEmail);

  if (!user) return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });

  const now = Date.now();
  if (!user.reset_code || user.reset_code !== code.trim()) {
    return res.status(400).json({ error: 'Tasdiqlash kodi noto\'g\'ri!' });
  }

  if (user.reset_used || (user.reset_expires && user.reset_expires < now)) {
    return res.status(400).json({ error: 'Tasdiqlash kodining muddati tugagan (10 daqiqa o\'tgan). Qayta so\'rov yuboring.' });
  }

  // Update password & invalidate code
  const hashed = bcrypt.hashSync(newPassword, 10);
  user.password = hashed;
  user.reset_used = true;
  user.reset_code = null;
  user.reset_expires = null;
  user.updated_at = new Date().toISOString();

  try { db.save(); } catch (e) {}

  return res.json({ success: true, message: 'Parolingiz muvaffaqiyatli tiklandi va yangilandi!' });
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

  // XAVFSIZLIK: Parolni faqat bcrypt orqali tekshirish
  const valid = currentPassword && user.password && bcrypt.compareSync(currentPassword, user.password);

  if (!valid) {
    return res.status(400).json({ error: 'Joriy parol noto\'g\'ri!' });
  }

  const hashed = bcrypt.hashSync(newPassword, 10);
  user.password = hashed;
  user.updated_at = new Date().toISOString();

  try { db.save(); } catch (e) {}

  res.json({ success: true, message: 'Parol muvaffaqiyatli o\'zgartirildi', userId: user.id });
});

module.exports = router;
