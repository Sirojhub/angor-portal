const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.warn('[Email] SMTP_USER yoki SMTP_PASS muhit o\'zgaruvchisi (.env) sozlanmagan!');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass }
  });
}

async function sendResetCodeEmail(toEmail, userName, otpCode) {
  const transporter = getTransporter();
  if (!transporter) {
    console.error('[Email] SMTP transporter yaratilmadi. SMTP_USER va SMTP_PASS muhit o\'zgaruvchilarini tekshiring.');
    return { ok: false, error: 'SMTP sozlanmagan (SMTP_USER/SMTP_PASS yetishmayapti)' };
  }

  console.log(`[Email] Email yuborilmoqda: ${toEmail} (Xodim: ${userName})`);
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: toEmail,
      subject: 'Angor Agro Star — Parolni tiklash kodi',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto">
          <h2>🔑 Parolni tiklash kodi</h2>
          <p>Salom, ${userName}!</p>
          <p>Sizning bir martalik tasdiqlash kodingiz:</p>
          <p style="font-size:28px;font-weight:bold;letter-spacing:4px">${otpCode}</p>
          <p>Kod 10 daqiqa amal qiladi. Agar bu so'rovni siz yubormagan bo'lsangiz, bu xabarni e'tiborsiz qoldiring.</p>
        </div>
      `
    });
    console.log('[Email] Email muvaffaqiyatli ketdi:', info.response || info.messageId);
    return { ok: true, info };
  } catch (e) {
    console.error('[Email] Nodemailer sendMail xatosi:', e);
    return { ok: false, error: e.message };
  }
}

module.exports = { sendResetCodeEmail };
