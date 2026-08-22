// ============================================================
// Activity Logs Routes — /api/logs
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const auth    = require('../middleware/auth');

// GET /api/logs
router.get('/', auth, (req, res) => {
  let logs;
  if (req.user.role === 'director') {
    logs = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 100').all();
  } else {
    logs = db.prepare('SELECT * FROM activity_logs WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.user.id);
  }
  res.json(logs);
});

module.exports = router;
