// ============================================================
// Superadmin Routes — /api/superadmin
// ============================================================
const express = require("express");
const router  = express.Router();
const jwt     = require("jsonwebtoken");
const crypto  = require("crypto");
const bcrypt  = require("bcryptjs");

let db;
try { db = require("../db/database"); } catch (e) {
  try { db = require("./db/database"); } catch (e2) { db = require("./server/db/database"); }
}

// Timing-safe solishtirish
function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a || ""));
  const bufB = Buffer.from(String(b || ""));
  const maxLen = Math.max(bufA.length, bufB.length);
  const paddedA = Buffer.concat([bufA, Buffer.alloc(maxLen - bufA.length)]);
  const paddedB = Buffer.concat([bufB, Buffer.alloc(maxLen - bufB.length)]);
  const equal = crypto.timingSafeEqual(paddedA, paddedB);
  return equal && bufA.length === bufB.length;
}

// Rate Limiting
const loginAttempts = new Map();
const MAX_ATTEMPTS  = 5;
const WINDOW_MS     = 15 * 60 * 1000;

function checkRateLimit(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + WINDOW_MS; }
  return rec;
}
function incrementRateLimit(ip) {
  const now = Date.now();
  const rec = loginAttempts.get(ip) || { count: 0, resetAt: now + WINDOW_MS };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + WINDOW_MS; }
  rec.count += 1;
  loginAttempts.set(ip, rec);
  return rec;
}
function resetRateLimit(ip) { loginAttempts.delete(ip); }

setInterval(() => {
  const now = Date.now();
  for (const [k, v] of loginAttempts.entries()) {
    if (now > v.resetAt + WINDOW_MS) loginAttempts.delete(k);
  }
}, 30 * 60 * 1000);

// Superadmin-only JWT middleware
function requireSuperadmin(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Token taqdim etilmagan" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "superadmin") {
      return res.status(403).json({ error: "Faqat superadmin kirishi mumkin" });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Token noto'g'ri yoki muddati tugagan" });
  }
}

// POST /api/superadmin/login
router.post("/login", (req, res) => {
  const validUser = process.env.SUPERADMIN_USERNAME;
  const validPass = process.env.SUPERADMIN_PASSWORD;

  if (!validUser || !validPass) {
    console.error("[Superadmin] SUPERADMIN_USERNAME/SUPERADMIN_PASSWORD sozlanmagan!");
    return res.status(500).json({ error: "Superadmin tizimi sozlanmagan" });
  }

  const ip  = req.ip || req.headers["x-forwarded-for"] || "unknown";
  const rec = checkRateLimit(ip);

  if (rec.count >= MAX_ATTEMPTS) {
    const minutesLeft = Math.ceil((rec.resetAt - Date.now()) / 60000);
    return res.status(429).json({
      error: `Juda ko'p xato urinish! ${minutesLeft} daqiqadan so'ng qayta urinib ko'ring.`
    });
  }

  const { username, password } = req.body;

  if (!username || !password ||
      !timingSafeEqual(username, validUser) ||
      !timingSafeEqual(password, validPass)) {
    const updated   = incrementRateLimit(ip);
    const remaining = MAX_ATTEMPTS - updated.count;
    console.warn(`[Superadmin] Muvaffaqiyatsiz: ${ip} (${updated.count}/${MAX_ATTEMPTS})`);
    return res.status(401).json({
      error: `Login yoki parol noto'g'ri. ${remaining > 0 ? remaining + " ta urinish qoldi." : "Hisob vaqtincha bloklandi."}`
    });
  }

  resetRateLimit(ip);
  const token = jwt.sign(
    { id: "superadmin", role: "superadmin", name: "Tizim administratori" },
    process.env.JWT_SECRET,
    { expiresIn: "12h" }
  );
  console.log(`[Superadmin] Muvaffaqiyatli kirish: ${ip}`);
  res.json({ success: true, token, user: { id: "superadmin", role: "superadmin", name: "Tizim administratori" } });
});

// GET /api/superadmin/users
router.get("/users", requireSuperadmin, (req, res) => {
  const users = (db.data.users || []).map(u => ({
    id: u.id, name: u.name, email: u.email, role: u.role,
    position: u.position, department: u.department, phone: u.phone,
    status: u.status || "active", created_at: u.created_at,
    avatar_color: u.avatar_color || u.avatarColor
  }));
  res.json(users);
});

// PUT /api/superadmin/users/:id/reset-password
router.put("/users/:id/reset-password", requireSuperadmin, (req, res) => {
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 6)
    return res.status(400).json({ error: "Parol kamida 6 ta belgidan iborat bo'lishi kerak" });

  const user = (db.data.users || []).find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });

  user.password      = bcrypt.hashSync(newPassword, 10);
  user.updated_at    = new Date().toISOString();
  user.reset_code    = null;
  user.reset_expires = null;
  user.reset_used    = null;
  try { db.save(); } catch (e) {}

  console.log(`[Superadmin] #${req.params.id} (${user.name}) paroli yangilandi`);
  res.json({ success: true });
});

// PUT /api/superadmin/users/:id/status
router.put("/users/:id/status", requireSuperadmin, (req, res) => {
  const { status } = req.body;
  if (!["active", "blocked"].includes(status))
    return res.status(400).json({ error: "Status 'active' yoki 'blocked' bo'lishi kerak" });
  const user = (db.data.users || []).find(u => u.id === parseInt(req.params.id));
  if (!user) return res.status(404).json({ error: "Foydalanuvchi topilmadi" });
  user.status = status;
  user.updated_at = new Date().toISOString();
  try { db.save(); } catch (e) {}
  res.json({ success: true });
});

// GET /api/superadmin/logs
router.get("/logs", requireSuperadmin, (req, res) => {
  const { userId, action, limit } = req.query;
  let logs = [...(db.data.activity_logs || [])].sort(
    (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0)
  );
  if (userId) logs = logs.filter(l => String(l.user_id) === String(userId));
  if (action) logs = logs.filter(l => l.action === action);
  res.json(logs.slice(0, parseInt(limit) || 200));
});

// GET /api/superadmin/stats
router.get("/stats", requireSuperadmin, (req, res) => {
  const users     = db.data.users     || [];
  const tasks     = db.data.tasks     || [];
  const documents = db.data.documents || [];
  const clients   = db.data.clients   || [];
  res.json({
    users: {
      total:   users.length,
      active:  users.filter(u => (u.status || "active") === "active").length,
      blocked: users.filter(u => u.status === "blocked").length,
      byRole:  users.reduce((acc, u) => { acc[u.role] = (acc[u.role] || 0) + 1; return acc; }, {})
    },
    tasks: {
      total:    tasks.length,
      byStatus: tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {})
    },
    documents: { total: documents.length },
    clients:   { total: clients.length }
  });
});

// GET /api/superadmin/settings
router.get("/settings", requireSuperadmin, (req, res) => {
  res.json(db.data.settings || {});
});

// POST /api/superadmin/settings
router.post("/settings", requireSuperadmin, (req, res) => {
  const { botToken, chatId, enabled } = req.body;
  if (!db.data.settings) db.data.settings = {};
  if (botToken !== undefined) db.data.settings["telegram_bot_token"] = botToken;
  if (chatId   !== undefined) db.data.settings["telegram_chat_id"]   = chatId;
  if (enabled  !== undefined) db.data.settings["telegram_enabled"]    = enabled;
  try { db.save(); } catch (e) {}
  try {
    const TG = require("../services/telegram");
    if (typeof TG.saveSettings === "function") {
      TG.saveSettings(
        botToken !== undefined ? botToken : db.data.settings["telegram_bot_token"],
        chatId   !== undefined ? chatId   : db.data.settings["telegram_chat_id"],
        enabled  !== undefined ? enabled  : true
      );
    }
  } catch (e) {}
  res.json({ success: true });
});

// POST /api/superadmin/telegram/test
router.post("/telegram/test", requireSuperadmin, async (req, res) => {
  const { botToken, chatId } = req.body;
  try {
    const TG = require("../services/telegram");
    if (botToken && chatId) TG.saveSettings(botToken, chatId, true);
    const text = `<b>Superadmin Test</b>\nTelegram ulandi!\n${new Date().toLocaleString("uz-UZ")}`;
    const result = await TG.sendMessage(text, botToken, chatId);
    res.json({ success: result.ok || false, result });
  } catch (e) {
    res.json({ success: false, error: e.message });
  }
});

module.exports = router;
