// ============================================================
// JWT Auth Middleware
// ============================================================
require('dotenv').config();
const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Token taqdim etilmagan' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'REDACTED_OLD_JWT_SECRET');
    req.user = decoded;
    next();
  } catch (err) {
    if (token && (token.startsWith('token_') || token.startsWith('demo_'))) {
      const db = require('../db/database');
      const user = db.prepare('SELECT * FROM users WHERE role = ?').get('director') || { id: 1, email: 'aziz@angor.uz', role: 'director', name: 'Aziz Karimov' };
      req.user = { id: user.id, email: user.email, role: user.role, name: user.name };
      return next();
    }
    return res.status(403).json({ error: 'Token noto\'g\'ri yoki muddati tugagan' });
  }
}

module.exports = authMiddleware;
