// ============================================================
// Activity Logs Routes — /api/logs
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const auth    = require('../middleware/auth');

// GET /api/logs
router.get('/', auth, (req, res) => {
  const logs = db.prepare('SELECT * FROM activity_logs ORDER BY created_at DESC LIMIT 50').all();
  res.json(logs);
});

module.exports = router;
