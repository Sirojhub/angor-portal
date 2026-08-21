// ============================================================
// Warehouse Routes — /api/warehouse
// ============================================================
const express = require('express');
const router  = express.Router();
const db      = require('../db/database');
const auth    = require('../middleware/auth');

// GET /api/warehouse
router.get('/', auth, (req, res) => {
  const items = db.prepare('SELECT * FROM warehouse_items ORDER BY id ASC').all();
  const txns  = db.prepare('SELECT * FROM warehouse_txn ORDER BY created_at DESC LIMIT 20').all();
  res.json({ items, transactions: txns });
});

// POST /api/warehouse/txn (Kirim/Chiqim)
router.post('/txn', auth, (req, res) => {
  const { item_id, type, quantity, note } = req.body;
  if (!item_id || !type || !quantity) {
    return res.status(400).json({ error: 'Barcha maydonlar to\'ldirilishi shart' });
  }

  const item = db.prepare('SELECT * FROM warehouse_items WHERE id = ?').get(item_id);
  if (!item) return res.status(404).json({ error: 'Mahsulot topilmadi' });

  let newStock = item.current_stock;
  const qty = parseFloat(quantity);

  if (type === 'kirim') {
    newStock += qty;
  } else if (type === 'chiqim') {
    if (newStock < qty) {
      return res.status(400).json({ error: 'Omborda yetarli mahsulot yo\'q' });
    }
    newStock -= qty;
  } else {
    return res.status(400).json({ error: 'Noto\'g\'ri operatsiya turi' });
  }

  const status = newStock <= item.min_stock ? 'low' : 'normal';

  db.prepare('UPDATE warehouse_items SET current_stock = ?, status = ?, updated_at = datetime(\'now\') WHERE id = ?').run(newStock, status, item_id);

  const result = db.prepare(`
    INSERT INTO warehouse_txn (item_id, item_name, type, quantity, note, date, created_by)
    VALUES (?, ?, ?, ?, ?, date('now'), ?)
  `).run(item_id, item.name, type, qty, note || '', req.user.id);

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, type === 'kirim' ? 'create' : 'update', 'warehouse', item_id, `«${item.name}» mahsulotidan ${qty} ${item.unit} ${type} qilindi`
  );

  const updatedItem = db.prepare('SELECT * FROM warehouse_items WHERE id = ?').get(item_id);
  res.json({ success: true, item: updatedItem });
});

module.exports = router;
