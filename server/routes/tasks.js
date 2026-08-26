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

  const { title, description, assigned_to, assigned_name, deadline, priority, category, batch_id } = req.body;

  if (!title || !assigned_to || !deadline) {
    return res.status(400).json({ error: 'Majburiy maydonlar to\'ldirilmagan' });
  }

  const targetEmployee = db.prepare('SELECT id FROM users WHERE id = ?').get(assigned_to);
  if (!targetEmployee) {
    return res.status(400).json({ error: 'Ko\'rsatilgan xodim tizimda topilmadi' });
  }

  // Insert task with optional batch_id
  const taskObj = {
    title,
    description: description || '',
    assigned_to: parseInt(assigned_to),
    assigned_name: assigned_name || '',
    deadline,
    priority: priority || 'medium',
    category: category || 'Ishlab chiqarish',
    status: 'new',
    created_by: req.user.id,
    batch_id: batch_id || null
  };

  const result = db.prepare(`INSERT INTO tasks`).run(taskObj);

  // Log
  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'create', 'task', result.lastInsertRowid, `«${title}» topshirig'ini yaratdi`
  );

  // Bildirishnoma (tayinlangan xodimga)
  const notifMsg = (parseInt(assigned_to) === req.user.id)
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

// PUT /api/tasks/:id (Task 3-BAND: Task editing permissions, locking & notifications)
router.put('/:id', auth, async (req, res) => {
  const { id } = req.params;
  const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!task) return res.status(404).json({ error: 'Topshiriq topilmadi' });

  const oldStatus = task.status;

  const isDirectorOrManager = req.user.role === 'director' || req.user.role === 'manager';
  const isAssignedEmployee = parseInt(task.assigned_to) === parseInt(req.user.id);

  if (!isDirectorOrManager && !isAssignedEmployee) {
    return res.status(403).json({ error: 'Bu topshiriqni tahrirlash huquqingiz yo\'q' });
  }

  // Audit Fix 3: Completed tasks locked for employees
  if (task.status === 'done' && !isDirectorOrManager) {
    return res.status(403).json({ error: 'Bajarilgan va tasdiqlangan topshiriq statusini faqat Direktor qayta ochishi mumkin' });
  }

  // Director/Manager can edit all fields
  // Assigned Employee can ONLY edit status (other fields are ignored)
  const fields = isDirectorOrManager 
    ? ['title','description','assigned_to','assigned_name','deadline','priority','category','status','review_comment']
    : ['status'];

  const updates = [];
  const values  = [];

  for (const f of fields) {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      values.push(req.body[f]);
    }
  }

  if (updates.length === 0) return res.status(400).json({ error: 'O\'zgartirish kiritilmadi' });

  updates.push('updated_at = datetime(\'now\')');
  values.push(id);

  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);

  // Audit Fix 2: Log & In-App Notifications for status transitions
  if (req.body.status && req.body.status !== oldStatus) {
    const newStatus = req.body.status;
    const statusMap = { new:'Yangi', progress:'Jarayonda', review:'Tasdiqlashda', done:'Bajarildi', rejected:'Rad etildi' };

    db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
      req.user.id, req.user.name, 'update', 'task', id, `«${task.title}» topshirig'i holatini «${statusMap[newStatus] || newStatus}» ga o'zgartirdi`
    );

    // In-App Notification oqimi:
    // 1. Employee -> Director/Manager: When submitted for review
    if (newStatus === 'review') {
      const recipientId = task.created_by || 1; // Director
      db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)`).run(
        recipientId, 'Topshiriq bajarildi (Tasdiqlash kutilmoqda)', `👤 ${req.user.name} «${task.title}» topshirig'ini bajarib topshirdi`, 'warning'
      );
    }
    // 2. Director -> Employee: When approved (done)
    else if (newStatus === 'done' && isDirectorOrManager && task.assigned_to !== req.user.id) {
      db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)`).run(
        task.assigned_to, 'Topshiriq tasdiqlandi', `✅ «${task.title}» topshirig'ingiz Direktor tomonidan tasdiqlandi`, 'success'
      );
    }
    // 3. Director -> Employee: When rejected / sent back for revision
    else if ((newStatus === 'rejected' || (newStatus === 'progress' && task.status === 'review')) && isDirectorOrManager && task.assigned_to !== req.user.id) {
      const reasonText = req.body.review_comment ? `\nSabab: ${req.body.review_comment}` : '';
      db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)`).run(
        task.assigned_to, 'Topshiriq rad etildi', `❌ «${task.title}» topshirig'ingiz rad etildi va qayta ko'rib chiqishga yuborildi.${reasonText}`, 'error'
      );
    }

    try {
      await TelegramService.notifyTaskStatusUpdate(updated || task, task.status, newStatus);
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
