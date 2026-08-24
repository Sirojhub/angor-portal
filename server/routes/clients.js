// ============================================================
// Clients Routes — /api/clients
// ============================================================
const express     = require('express');
const router      = express.Router();
const db          = require('../db/database');
const auth        = require('../middleware/auth');
const requireRole = require('../middleware/requireRole');

// GET /api/clients (Viewable by all authenticated users)
router.get('/', auth, (req, res) => {
  const clients = db.prepare('SELECT * FROM clients ORDER BY name ASC').all();
  res.json(clients);
});

// POST /api/clients (Task 4-BAND: Only Director/Manager can add clients)
router.post('/', auth, requireRole('director', 'manager'), (req, res) => {
  const { name, inn, country, city, contact_person, phone, email, contract_number, ai_risk, risk_text, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'Firma nomi majburiy' });

  const result = db.prepare(`
    INSERT INTO clients (name, inn, country, city, contact_person, phone, email, contract_number, ai_risk, risk_text, status, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(name, inn||'', country||"O'zbekiston", city||'', contact_person||'', phone||'', email||'', contract_number||'', ai_risk||'low', risk_text||'', notes||'');

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'create', 'client', result.lastInsertRowid, `«${name}» mijozini qo'shdi`
  );

  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, client });
});

// PUT /api/clients/:id (Task 4-BAND: Only Director/Manager can edit clients)
router.put('/:id', auth, requireRole('director', 'manager'), (req, res) => {
  const { id } = req.params;
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  if (!client) return res.status(404).json({ error: 'Mijoz topilmadi' });

  const fields = ['name','inn','country','city','contact_person','phone','email','contract_number','ai_risk','risk_text','status','notes'];
  const updates = []; const values = [];
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = ?`); values.push(req.body[f]); }
  }
  if (!updates.length) return res.status(400).json({ error: 'O\'zgartirish yo\'q' });
  values.push(id);

  db.prepare(`UPDATE clients SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'update', 'client', id, `«${client.name}» mijozini tahrirladi`
  );

  const updated = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
  res.json({ success: true, client: updated });
});

// DELETE /api/clients/:id (Task 4-BAND: Only Director/Manager can delete clients)
router.delete('/:id', auth, requireRole('director', 'manager'), (req, res) => {
  const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(req.params.id);
  if (!client) return res.status(404).json({ error: 'Mijoz topilmadi' });

  db.prepare('DELETE FROM clients WHERE id = ?').run(req.params.id);

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'delete', 'client', req.params.id, `«${client.name}» mijozini o'chirdi`
  );
  res.json({ success: true });
});

module.exports = router;
