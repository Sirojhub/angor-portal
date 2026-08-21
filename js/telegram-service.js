// ============================================================
// ANGOR AGRO STAR PORTAL — Telegram Bot Frontend Xizmati
// ============================================================

const TelegramService = {
  // Telegram Bot sozlamalari (localStorage va Serverda saqlanadi)
  getSettings() {
    return JSON.parse(localStorage.getItem('ags_telegram_settings') || JSON.stringify({
      enabled: true,
      botToken: '8994107544:AAETtz3NXgGz9lRfmKZXgPuDboSMCUIe6nc',
      chatId: '1052080030', // Telegram guruh yoki kanal ID
      notifyOnNewTask: true,
      notifyOnTaskDone: true,
      notifyOnOverdue: true
    }));
  },

  saveSettings(settings) {
    localStorage.setItem('ags_telegram_settings', JSON.stringify(settings));
    if (window.API) {
      API.request('telegram/settings', 'POST', {
        botToken: settings.botToken,
        chatId: settings.chatId,
        enabled: settings.enabled
      });
    }
  },

  // Telegramga xabar yuborish
  async sendNotification(type, data) {
    const settings = this.getSettings();
    if (!settings.enabled) return;

    if (window.API) {
      try {
        const res = await API.request('telegram/notify', 'POST', { type, task: data });
        return res;
      } catch (e) {
        console.log(`[Telegram Simulation] ${type==='done'?'✅ Topshiriq bajarildi':'📌 Yangi topshiriq'}: «${data.title}» -> Chat ID: ${settings.chatId}`);
        return { success: true, mock: true };
      }
    }
  },

  // Bot sinovi (Test Message)
  async testBot(token, chatId) {
    if (window.API) {
      try {
        const res = await API.request('telegram/test', 'POST', { botToken: token, chatId });
        return res;
      } catch (e) {
        return { success: true, mock: true, message: 'Test xabari simulyatsiya qilindi' };
      }
    }
  }
};
