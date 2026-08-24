// ============================================================
// ANGOR AGRO STAR PORTAL — Telegram Bot Service
// ============================================================
const https = require('https');
const db    = require('../db/database');

const TelegramService = {
  getSettings() {
    let botToken = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
    let chatId   = (process.env.TELEGRAM_CHAT_ID || '').trim();
    let enabled  = true;

    try {
      const tokenSetting  = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_bot_token');
      const chatIdSetting = db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_chat_id');
      const enabledSetting= db.prepare('SELECT value FROM settings WHERE key = ?').get('telegram_enabled');

      if (tokenSetting && tokenSetting.value) botToken = tokenSetting.value.trim();
      if (chatIdSetting && chatIdSetting.value) chatId = chatIdSetting.value.trim();
      if (enabledSetting) enabled = enabledSetting.value === 'true';
    } catch (e) {}

    return { botToken, chatId, enabled };
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

    if (!token || !chatId || !settings.enabled) {
      console.log('[Telegram Bot] Token yoki Chat ID sozlanmagan, xabarnoma o\'tkazib yuborildi.');
      return Promise.resolve({ ok: false, error: 'Telegram Bot sozlanmagan' });
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

  notifyNewTask(task, customChatId = null) {
    const priorityEmoji = { high: '🔴 Yuqori', medium: '🟡 O\'rtacha', low: '🟢 Past' };
    const empName = task.assigned_name || task.assignedName || 'Xodim';

    // Resolve assigned employee's specific Telegram Chat ID
    let targetChatId = customChatId;
    if (!targetChatId && (task.assigned_to || task.assignedTo)) {
      const targetUserId = task.assigned_to || task.assignedTo;
      try {
        const u = db.prepare('SELECT telegram_chat_id, chat_id FROM users WHERE id = ?').get(targetUserId);
        if (u) targetChatId = u.telegram_chat_id || u.chat_id;
      } catch (e) {}
    }

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
ℹ️ <i>Portal orqali qabul qilib oling: https://angor-portal.onrender.com</i>
    `.trim();

    // Send ONLY to the assigned target employee's Chat ID if available!
    if (targetChatId) {
      return this.sendMessage(text, null, targetChatId);
    }
    // Fallback to default Admin channel ONLY if assigned employee has no Chat ID
    const defaultChat = this.getSettings().chatId;
    if (defaultChat) {
      return this.sendMessage(text, null, defaultChat);
    }
    return Promise.resolve({ ok: true });
  },

  notifyTaskStatusUpdate(task, oldStatus, newStatus, customChatId = null) {
    const statusText = {
      new: '🆕 Yangi',
      progress: '⚡ Jarayonda',
      review: '⏳ Tasdiqlashda',
      done: '✅ Bajarildi',
      rejected: '❌ Rad etildi'
    };
    const empName = task.assigned_name || task.assignedName || 'Xodim';

    let targetChatId = customChatId;
    if (!targetChatId && (task.assigned_to || task.assignedTo)) {
      const targetUserId = task.assigned_to || task.assignedTo;
      try {
        const u = db.prepare('SELECT telegram_chat_id, chat_id FROM users WHERE id = ?').get(targetUserId);
        if (u) targetChatId = u.telegram_chat_id || u.chat_id;
      } catch (e) {}
    }

    const text = `
<b>🌾 ANGOR AGRO STAR — TOPSHIRIQ HOLATI O'ZGARDI</b>
--------------------------------------
📋 <b>Topshiriq:</b> ${task.title}
👤 <b>Mas'ul:</b> ${empName}
🔄 <b>Eski holat:</b> ${statusText[oldStatus] || oldStatus}
👉 <b>Yangi holat:</b> ${statusText[newStatus] || newStatus}
--------------------------------------
ℹ️ <i>Boshqaruv paneli: https://angor-portal.onrender.com</i>
    `.trim();

    if (targetChatId) {
      return this.sendMessage(text, null, targetChatId);
    }
    const defaultChat = this.getSettings().chatId;
    if (defaultChat) {
      return this.sendMessage(text, null, defaultChat);
    }
    return Promise.resolve({ ok: true });
  },

  notifyNewDocument(doc, customChatId = null) {
    let targetChatId = customChatId;
    if (!targetChatId && (doc.target_user_id || doc.targetUserId)) {
      const tid = doc.target_user_id || doc.targetUserId;
      try {
        const u = db.prepare('SELECT telegram_chat_id, chat_id FROM users WHERE id = ?').get(tid);
        if (u) targetChatId = u.telegram_chat_id || u.chat_id;
      } catch (e) {}
    }

    const text = `
<b>🌾 ANGOR AGRO STAR — YANGI HUJJAT YUKLANDI</b>
--------------------------------------
📄 <b>Hujjat:</b> ${doc.title}
👤 <b>Yuklovchi:</b> ${doc.uploaded_name || doc.uploadedName || 'Foydalanuvchi'}
🎯 <b>Mas'ul:</b> ${doc.target_user_name || doc.targetUserName || 'Barcha xodimlar'}
📁 <b>Turkum:</b> ${doc.category || 'Umumiy'}
📦 <b>Fayl:</b> ${doc.file_type || doc.fileType || 'FAYL'} (${doc.file_size || doc.fileSize || ''})

📝 <b>Tavsif:</b> ${doc.description || 'Izoh berilmagan'}
--------------------------------------
ℹ️ <i>Portal orqali ko'rib chiqing: https://angor-portal.onrender.com</i>
    `.trim();

    if (targetChatId) {
      return this.sendMessage(text, null, targetChatId);
    }
    const defaultChat = this.getSettings().chatId;
    if (defaultChat) {
      return this.sendMessage(text, null, defaultChat);
    }
    return Promise.resolve({ ok: true });
  }
};

module.exports = TelegramService;
