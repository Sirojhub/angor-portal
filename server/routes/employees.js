// ============================================================
// Employees Routes — /api/employees
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const auth    = require('../middleware/auth');
const bcrypt  = require('bcryptjs');

// GET /api/employees
router.get('/', auth, (req, res) => {
  const users = db.prepare('SELECT id, name, email, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status, telegram_chat_id, chat_id, created_at FROM users ORDER BY id ASC').all();
  res.json(users);
});

// POST /api/employees
router.post('/', auth, (req, res) => {
  if (req.user.role !== 'director' && req.user.role !== 'manager') {
    return res.status(403).json({ error: 'Ruxsat berilmadi' });
  }

  const { name, email, password, role, position, department, phone, avatar, avatarColor, avatar_color, hireDate, hire_date, telegram_chat_id, chatId, chat_id } = req.body;
  if (!name || !email) {
    return res.status(400).json({ error: 'Ism va email kiritilishi shart' });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'Parol kamida 6 belgidan iborat bo\'lishi shart' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(400).json({ error: 'Bu email bilan foydalanuvchi allaqachon mavjud' });
  }

  const hash = bcrypt.hashSync(password, 10);
  const userAvatar = avatar || name.split(' ').map(x=>x[0]).join('').toUpperCase().slice(0,2);
  const userColor = avatarColor || avatar_color || '#C8922A';
  const userHireDate = hireDate || hire_date || new Date().toISOString().slice(0,10);
  const userTelegramId = (telegram_chat_id || chatId || chat_id || '').trim();

  const result = db.prepare(`
    INSERT INTO users (name, email, password, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status, telegram_chat_id, chat_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 75, 'active', ?, ?)
  `).run(name, email, hash, role || 'employee', position || 'Xodim', department || 'Boshqaruv', phone || '', userAvatar, userColor, userHireDate, userTelegramId, userTelegramId);

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'create', 'user', result.lastInsertRowid, `Yangi xodim «${name}» ni qo'shdi`
  );

  const newUser = db.prepare('SELECT id, name, email, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status, telegram_chat_id, chat_id FROM users WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, employee: newUser });
});

// PUT /api/employees/:id
router.put('/:id', auth, (req, res) => {
  const { id } = req.params;
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  if (!user) return res.status(404).json({ error: 'Xodim topilmadi' });

  const isDirectorOrManager = req.user.role === 'director' || req.user.role === 'manager';
  const isSelf = req.user.id === parseInt(id);

  if (!isDirectorOrManager && !isSelf) {
    return res.status(403).json({ error: 'Ruxsat etilmagan: ushbu profilni tahrirlash huquqingiz yo\'q' });
  }

  // Task 1-BAND: Scoped field selection
  // Director/Manager: can update all profile & RBAC fields
  // Employee self-edit: ONLY name, phone, avatar, avatar_color, telegram_chat_id, password (role, position, department, hire_date, efficiency, status are ignored)
  const fields = isDirectorOrManager 
    ? ['name','role','position','department','phone','avatar','avatar_color','hire_date','efficiency','status']
    : ['name','phone','avatar','avatar_color'];

  const updates = []; const values = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  }

  if (req.body.telegram_chat_id !== undefined || req.body.chatId !== undefined || req.body.chat_id !== undefined) {
    const tgId = (req.body.telegram_chat_id || req.body.chatId || req.body.chat_id || '').toString().trim();
    updates.push('telegram_chat_id = ?'); values.push(tgId);
    updates.push('chat_id = ?'); values.push(tgId);
  }

  if (req.body.password) {
    updates.push('password = ?');
    values.push(bcrypt.hashSync(req.body.password, 10));
  }

  if (!updates.length) return res.status(400).json({ error: 'O\'zgartirish kiritilmadi' });
  values.push(parseInt(id));

  db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'update', 'user', id, `«${user.name}» xodimi ma'lumotlarini yangiladi`
  );

  const updated = db.prepare('SELECT id, name, email, role, position, department, phone, avatar, avatar_color, hire_date, efficiency, status, telegram_chat_id, chat_id FROM users WHERE id = ?').get(id);
  res.json({ success: true, employee: updated });
});

// DELETE /api/employees/:id
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'director') {
    return res.status(403).json({ error: 'Faqat direktor xodimlarni o\'chira oladi' });
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'Xodim topilmadi' });

  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'delete', 'user', req.params.id, `«${user.name}» xodimini o'chirdi`
  );

  res.json({ success: true });
});

module.exports = router;
