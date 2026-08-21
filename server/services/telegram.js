// ============================================================
// ANGOR AGRO STAR PORTAL — Telegram Bot Service
// ============================================================
const https = require('https');
const db    = require('../db/database');

const TelegramService = {
  getSettings() {
    try {
      const tokenSetting  = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_bot_token');
      const chatIdSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_chat_id');
      const enabledSetting= db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_enabled');

      return {
        botToken: tokenSetting ? tokenSetting.value : '8994107544:AAETtz3NXgGz9lRfmKZXgPuDboSMCUIe6nc',
        chatId: chatIdSetting ? chatIdSetting.value : '1052080030',
        enabled: enabledSetting ? enabledSetting.value === 'true' : true
      };
    } catch (e) {
      return {
        botToken: '8994107544:AAETtz3NXgGz9lRfmKZXgPuDboSMCUIe6nc',
        chatId: '1052080030',
        enabled: true
      };
    }
  },

  saveSettings(token, chatId, enabled) {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('telegram_bot_token', token || '');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('telegram_chat_id', chatId || '');
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run('telegram_enabled', enabled ? 'true' : 'false');
  },

  sendMessage(text, customToken = null, customChatId = null) {
    const settings = this.getSettings();
    const token = (customToken || settings.botToken || '').trim();
    const chatId = (customChatId || settings.chatId || '').trim();

    if (!token || !chatId) {
      console.log('[Telegram Bot] Token yoki Chat ID ko\'rsatilmagan');
      return Promise.resolve({ ok: false, error: 'Token yoki Chat ID kiritilmagan' });
    }

    const postData = JSON.stringify({
      chat_id: chatId,
      text: text,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      port: 443,
      path: `/bot${token}/sendMessage`,
      method: 'POST',
      family: 4,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
      }
    };

    return new Promise((resolve) => {
      const req = https.request(options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const json = JSON.parse(body);
            resolve(json);
          } catch (e) {
            resolve({ ok: false, error: e.message });
          }
        });
      });

      req.on('error', (e) => {
        console.warn('[Telegram Bot] Yuborishda xato:', e.message);
        resolve({ ok: false, error: e.message });
      });

      req.write(postData);
      req.end();
    });
  },

  notifyNewTask(task) {
    const priorityEmoji = { high: '🔴 Yuqori', medium: '🟡 O\'rtacha', low: '🟢 Past' };
    const empName = task.assigned_name || task.assignedName || 'Xodim';
    const text = `
<b>🌾 ANGOR AGRO STAR — YANGI TOPSHIRIQ</b>
--------------------------------------
📋 <b>Sarlavha:</b> ${task.title}
👤 <b>Mas'ul xodim:</b> ${empName}
⏰ <b>Muddat:</b> ${task.deadline || 'Belgilanmagan'}
⚡ <b>Muhimlik:</b> ${priorityEmoji[task.priority] || task.priority || '🟡 O\'rtacha'}
📁 <b>Turkum:</b> ${task.category || 'Ishlab chiqarish'}

📝 <b>Tavsif:</b> ${task.description || 'Qo\'shimcha izoh berilmagan'}
--------------------------------------
ℹ️ <i>Portal orqali qabul qilib oling: http://localhost:3000</i>
    `.trim();

    return this.sendMessage(text);
  },

  notifyTaskStatusUpdate(task, oldStatus, newStatus) {
    const statusText = {
      new: '🆕 Yangi',
      progress: '⚡ Jarayonda',
      review: '⏳ Tasdiqlashda',
      done: '✅ Bajarildi',
      rejected: '❌ Rad etildi'
    };
    const empName = task.assigned_name || task.assignedName || 'Xodim';

    const text = `
<b>🌾 ANGOR AGRO STAR — TOPSHIRIQ HOLATI O'ZGARDI</b>
--------------------------------------
📋 <b>Topshiriq:</b> ${task.title}
👤 <b>Mas'ul:</b> ${empName}
🔄 <b>Eski holat:</b> ${statusText[oldStatus] || oldStatus}
👉 <b>Yangi holat:</b> ${statusText[newStatus] || newStatus}
--------------------------------------
ℹ️ <i>Boshqaruv paneli: http://localhost:3000</i>
    `.trim();

    return this.sendMessage(text);
  }
};

module.exports = TelegramService;
