// ============================================================
// JWT Auth Middleware & Role-Based Access Control (RBAC)
// ============================================================
require('dotenv').config();
const jwt = require('jsonwebtoken');

if (!process.env.JWT_SECRET) {
  console.error('[CRITICAL] JWT_SECRET environment variable is not defined in .env!');
  throw new Error('JWT_SECRET muhit o\'zgaruvchisi (.env) sozlanmagan!');
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token taqdim etilmagan' });
  }

  // Strict JWT verification with secure fallback
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    return next();
  } catch (err) {
    return res.status(403).json({ error: 'Token noto\'g\'ri yoki muddati tugagan' });
  }
}

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'Autentifikatsiya talab etiladi' });
    }
    // Xavfsizlik: superadmin endpointlariga FAQAT superadmin kiradi
    // Director avtomatik bypass qilinmaydi
    if (allowedRoles.includes(req.user.role)) {
      return next();
    }
    return res.status(403).json({ error: 'Ruxsat etilmagan: ushbu amal uchun huquq yetarli emas' });
  };
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireRole = requireRole;


