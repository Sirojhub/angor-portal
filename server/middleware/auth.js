// ============================================================
// JWT Auth Middleware & Role-Based Access Control (RBAC)
// ============================================================
require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'REDACTED_OLD_JWT_SECRET';

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token taqdim etilmagan' });
  }

  // Strict JWT verification with secure fallback
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
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
    if (allowedRoles.includes('all') || allowedRoles.includes(req.user.role) || req.user.role === 'director') {
      return next();
    }
    return res.status(403).json({ error: 'Ruxsat etilmagan: ushbu amal uchun huquq yetarli emas' });
  };
}

module.exports = authMiddleware;
module.exports.authMiddleware = authMiddleware;
module.exports.requireRole = requireRole;


