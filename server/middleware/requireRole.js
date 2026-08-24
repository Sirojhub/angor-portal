// ============================================================
// Centralized Role-Based Access Control (RBAC) Middleware
// ============================================================
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Ruxsat berilmadi' });
    }
    next();
  };
}

module.exports = requireRole;
