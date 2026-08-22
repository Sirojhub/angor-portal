// ============================================================
// Tasks Routes — /api/tasks
// ============================================================
const express         = require('express');
const router          = express.Router();
const db              = require('../db/database');
const auth            = require('../middleware/auth');
const TelegramService = require('../services/telegram');

// GET /api/tasks
router.get('/', auth, (req, res) => {
  let tasks;
  const { status, assignedTo } = req.query;

  // Director: barchani ko'radi, boshqalar: faqat o'zlariga tegishlilarni
  if (req.user.role === 'director' || req.user.role === 'manager') {
    tasks = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all();
  } else {
    tasks = db.prepare('SELECT * FROM tasks WHERE assigned_to = ? ORDER BY created_at DESC').all(req.user.id);
  }

  if (status && status !== 'all') {
    tasks = tasks.filter(t => t.status === status);
  }

  res.json(tasks);
});

// POST /api/tasks
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'director') {
    return res.status(403).json({ error: 'Faqat Direktor yangi topshiriq berishi mumkin' });
  }

  const { title, description, assigned_to, assigned_name, deadline, priority, category } = req.body;

  if (!title || !assigned_to || !deadline) {
    return res.status(400).json({ error: 'Majburiy maydonlar to\'ldirilmagan' });
  }

  const result = db.prepare(`
    INSERT INTO tasks (title, description, assigned_to, assigned_name, deadline, priority, category, status, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'new', ?)
  `).run(title, description || '', assigned_to, assigned_name, deadline, priority || 'medium', category || 'Ishlab chiqarish', req.user.id);

  // Log
  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'create', 'task', result.lastInsertRowid, `«${title}» topshirig'ini yaratdi`
  );

  // Bildirishnoma (tayinlangan xodimga)
  const notifMsg = (assigned_to === req.user.id)
    ? `Siz o'zingizga «${title}» topshirig'ini tayinlandingiz`
    : `Sizga «${title}» topshirig'i tayinlandi`;

  db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)`).run(
    assigned_to, 'Yangi topshiriq', notifMsg, 'info'
  );

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

  // Telegram bot xabari
  try {
    await TelegramService.notifyNewTask(task);
  } catch (e) {
    console.warn('[Telegram] Bildirishnoma yuborishda xato:', e.message);
  }

  res.json({ success: true, task });
});

// PUT /api/tasks/:id
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Topshiriq topilmadi' });

  const fields = ['title','description','assigned_to','assigned_name','deadline','priority','category','status'];
  const updates = [];
  const values  = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'O\'zgartirish yo\'q' });

  updates.push('updated_at = datetime(\'now\')');
  values.push(id);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  // Log & Telegram notification
  if (req.body.status && req.body.status !== task.status) {
    const statusMap = { new:'Yangi', progress:'Jarayonda', review:'Tasdiqlashda', done:'Bajarildi', rejected:'Rad etildi' };
    db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
      req.user.id, req.user.name, 'update', 'task', id, `«${task.title}» topshirig'i holatini «${statusMap[req.body.status] || req.body.status}» ga o'zgartirdi`
    );

    try {
      await TelegramService.notifyTaskStatusUpdate(updated || task, task.status, req.body.status);
    } catch (e) {
      console.warn('[Telegram] Status yuborishda xato:', e.message);
    }
  }

  res.json({ success: true, task: updated });
});

// DELETE /api/tasks/:id
router.delete('/:id', auth, (req, res) => {
  if (req.user.role !== 'director') {
    return res.status(403).json({ error: 'Faqat Direktor topshiriqlarni o\'chira oladi' });
  }

  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Topshiriq topilmadi' });

  db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'delete', 'task', req.params.id, `«${task.title}» topshirig'ini o'chirdi`
  );

  res.json({ success: true });
});

module.exports = router;
