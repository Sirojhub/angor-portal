// ============================================================
// Telegram Bot Routes — /api/telegram
// ============================================================
const express         = require('express');
const router          = express.Router();
const auth            = require('../middleware/auth');
const requireRole     = require('../middleware/requireRole');
const TelegramService = require('../services/telegram');

// GET /api/telegram/settings (faqat Superadmin ko'ra oladi)
router.get('/settings', auth, requireRole('superadmin'), (req, res) => {
  const settings = TelegramService.getSettings();
  res.json(settings);
});

// POST /api/telegram/settings (faqat Superadmin o'zgartira oladi)
router.post('/settings', auth, requireRole('superadmin'), (req, res) => {
  const { botToken, chatId, enabled } = req.body;
  TelegramService.saveSettings(botToken, chatId, enabled);
  res.json({ success: true, settings: TelegramService.getSettings() });
});

// POST /api/telegram/test (faqat Superadmin test qila oladi)
router.post('/test', auth, requireRole('superadmin'), async (req, res) => {
  const { botToken, chatId } = req.body;
  if (botToken && chatId) {
    TelegramService.saveSettings(botToken, chatId, true);
  }

  const testText = `
<b>🤖 ANGOR AGRO STAR — TELEGRAM BOT TESTI</b>
--------------------------------------
✅ Telegram Bot servisi muvaffaqiyatli ulangan!
📅 Sana: ${new Date().toLocaleString('uz-UZ')}
👤 Sinagan foydalanuvchi: ${req.user.name}
--------------------------------------
🌾 <i>Korporativ Boshqaruv Tizimi</i>
  `.trim();

  const result = await TelegramService.sendMessage(testText, botToken, chatId);
  res.json({ success: result.ok || false, result });
});

// POST /api/telegram/notify
router.post('/notify', auth, async (req, res) => {
  const { type, task } = req.body;
  if (!task) return res.status(400).json({ error: 'Topshiriq ma\'lumotlari ko\'rsatilmadi' });

  let result;
  if (type === 'done' || type === 'update') {
    result = await TelegramService.notifyTaskStatusUpdate(task, task.oldStatus || 'jarayonda', task.status || 'done');
  } else {
    result = await TelegramService.notifyNewTask(task);
  }

  res.json({ success: result ? (result.ok || false) : false, result });
});

module.exports = router;
