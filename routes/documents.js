// ============================================================
// Documents Routes — /api/documents (Real File Uploads)
// ============================================================
const express = require('express');
const router  = express.Router();
const path    = require('path');
const fs      = require('fs');
const multer  = require('multer');
const db      = require('../db/database');
const auth    = require('../middleware/auth');

// Uploads papkasini tayyorlash
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Multer saqlash sozlamalari
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9_\-.]/g, '_');
    const uniqueName = `${Date.now()}_${safeName}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB maks
});

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileTypeExt(filename, mimeType) {
  const ext = path.extname(filename).toUpperCase().replace('.', '');
  if (ext) return ext;
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLSX';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOCX';
  if (mimeType.includes('image')) return 'JPG';
  return 'FILE';
}

// GET /api/documents
router.get('/', auth, (req, res) => {
  const { category } = req.query;
  let docs;
  if (category && category !== 'all') {
    docs = db.prepare('SELECT * FROM documents WHERE category = ? ORDER BY upload_date DESC').all(category);
  } else {
    docs = db.prepare('SELECT * FROM documents ORDER BY upload_date DESC').all();
  }
  res.json(docs);
});

// POST /api/documents (Real File Upload)
router.post('/', auth, upload.single('file'), async (req, res) => {
  const { title, category, version, description, target_user_id, target_user_name, reply_to_id } = req.body;

  if (!title || !category) {
    return res.status(400).json({ error: 'Sarlavha va kategoriya kiritilishi shart' });
  }

  let filePath = null;
  let fileSize = '1.2 MB';
  let fileType = 'PDF';

  if (req.file) {
    filePath = `/uploads/${req.file.filename}`;
    fileSize = formatFileSize(req.file.size);
    fileType = getFileTypeExt(req.file.originalname, req.file.mimetype);
  } else if (req.body.fileType) {
    fileType = req.body.fileType;
  }

  const targetId = target_user_id ? parseInt(target_user_id) : null;
  const replyId = reply_to_id ? parseInt(reply_to_id) : null;

  const result = db.prepare(`
    INSERT INTO documents (title, category, version, file_type, file_size, file_path, uploaded_by, uploaded_name, upload_date, status, description, target_user_id, target_user_name, reply_to_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'), 'active', ?, ?, ?, ?)
  `).run(
    title,
    category,
    version || 'v1',
    fileType,
    fileSize,
    filePath,
    req.user.id,
    req.user.name,
    description || '',
    targetId,
    target_user_name || null,
    replyId
  );

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'upload', 'document', result.lastInsertRowid, `Yangi hujjat yukladi: «${title}» (${fileType}, ${fileSize})${target_user_name ? ' 🎯 Mas\'ul: '+target_user_name : ''}`
  );

  // In-app Notification
  if (targetId && targetId !== req.user.id) {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)`).run(
      targetId, 'Yangi hujjat biriktirildi', `${req.user.name} sizga «${title}» hujjatini biriktirdi`, 'info'
    );
  }

  // Telegram notification
  try {
    const TelegramService = require('../services/telegram');
    const msg = `
<b>🌾 ANGOR AGRO STAR — YANGI HUJJAT YUKLANDI</b>
--------------------------------------
📄 <b>Hujjat:</b> ${title}
👤 <b>Yuklovchi:</b> ${req.user.name}
🎯 <b>Mas'ul xodim:</b> ${target_user_name || 'Barcha xodimlar'}
📁 <b>Turkum:</b> ${category}
📦 <b>Fayl turi:</b> ${fileType} (${fileSize})
--------------------------------------
ℹ️ <i>Portal orqali ko'rib chiqing: http://localhost:3000</i>
    `.trim();
    await TelegramService.sendMessage(msg);
  } catch (e) {
    console.warn('[Telegram] Hujjat bildirishnoma xatosi:', e.message);
  }

  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
  res.json({ success: true, document: doc });
});

// DELETE /api/documents/:id
router.delete('/:id', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Hujjat topilmadi' });

  // Agar fayl diskda bo'lsa, o'chirish
  if (doc.file_path) {
    const fullPath = path.resolve(__dirname, '../..', doc.file_path.replace(/^\//, ''));
    if (fs.existsSync(fullPath)) {
      try { fs.unlinkSync(fullPath); } catch (e) {}
    }
  }

  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'delete', 'document', req.params.id, `«${doc.title}» hujjatini o'chirdi`
  );

  res.json({ success: true });
});

module.exports = router;
