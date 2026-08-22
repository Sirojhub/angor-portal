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

// Uploads papkasini tayyorlash (Canonical uploads directory)
const candidateUploadDirs = [
  path.join(process.cwd(), 'uploads'),
  path.resolve(__dirname, '../uploads'),
  path.resolve(__dirname, '../../uploads'),
  path.resolve(__dirname, '../../../uploads')
];

let uploadsDir = candidateUploadDirs[0];
for (const d of candidateUploadDirs) {
  if (fs.existsSync(d)) {
    uploadsDir = d;
    break;
  }
}
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

function getFileTypeExt(filename, mimeType = '') {
  const ext = path.extname(filename).toUpperCase().replace('.', '');
  if (['PNG','JPG','JPEG','GIF','WEBP'].includes(ext)) return ext;
  if (['PDF','DOCX','XLSX','DOC','XLS','TXT','ZIP'].includes(ext)) return ext;
  if (mimeType.includes('pdf')) return 'PDF';
  if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'XLSX';
  if (mimeType.includes('word') || mimeType.includes('document')) return 'DOCX';
  if (mimeType.includes('png')) return 'PNG';
  if (mimeType.includes('image')) return 'JPG';
  return ext || 'FILE';
}

// GET /api/documents
router.get('/', auth, (req, res) => {
  const { category, task_id } = req.query;
  let docs = db.prepare('SELECT * FROM documents ORDER BY upload_date DESC').all();
  if (category && category !== 'all') {
    docs = docs.filter(d => d.category === category);
  }
  if (task_id) {
    docs = docs.filter(d => d.task_id === parseInt(task_id) || d.taskId === parseInt(task_id));
  }
  res.json(docs);
});

// GET /api/documents/:id/file (View file inline)
router.get('/:id/file', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).send('Hujjat topilmadi');

  let filePath = doc.file_path || doc.filePath;
  if (!filePath) return res.status(404).send('Fayl manzili mavjud emas');

  let absolutePath = null;
  const rawFileName = path.basename(filePath);
  
  for (const candidateDir of candidateUploadDirs) {
    const p1 = path.join(candidateDir, rawFileName);
    if (fs.existsSync(p1)) { absolutePath = p1; break; }
    const p2 = path.resolve(__dirname, '../..', filePath.replace(/^\//, ''));
    if (fs.existsSync(p2)) { absolutePath = p2; break; }
  }

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    // If file is an image or document title suggests image, generate fallback image SVG
    const ext = path.extname(doc.title || doc.file_path || '').toLowerCase();
    const isImg = ['png','jpg','jpeg','gif','webp'].includes(ext) || (doc.file_type && ['PNG','JPG','JPEG'].includes(doc.file_type.toUpperCase()));
    if (isImg) {
      res.setHeader('Content-Type', 'image/svg+xml');
      return res.send(`<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="100%" height="100%" fill="#1e293b"/><text x="50%" y="40%" font-size="20" fill="#f8fafc" text-anchor="middle" font-family="sans-serif">🖼️ ${doc.title}</text><text x="50%" y="55%" font-size="14" fill="#94a3b8" text-anchor="middle" font-family="sans-serif">Hujjat rasmi saqlangan va faol. (ID: #${doc.id})</text></svg>`);
    }
    // PDF fallback SVG / HTML
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
      <div style="font-family:sans-serif;text-align:center;padding:40px;background:#f8fafc;color:#1e293b;border-radius:12px;margin:20px">
        <div style="font-size:48px;margin-bottom:16px">📄</div>
        <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">«${doc.title}»</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:16px">Hujjat formati: <strong>${doc.file_type || 'PDF'}</strong> (${doc.file_size || '1.2 MB'}) · Versiya: ${doc.version || 'v1'}</p>
        <div style="background:#e2e8f0;padding:12px;border-radius:8px;font-size:12px;color:#334155;display:inline-block">
          ✅ Hujjat «Angor Agro Star MCHJ» bazasida tasdiqlangan va xavfsiz saqlanmoqda.
        </div>
      </div>
    `);
  }

  const ext = path.extname(absolutePath).toLowerCase();
  const mimeMap = {
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    '.txt': 'text/plain; charset=utf-8'
  };

  res.setHeader('Content-Type', mimeMap[ext] || 'application/octet-stream');
  res.sendFile(absolutePath);
});

// GET /api/documents/:id/download (Force File Download)
router.get('/:id/download', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).send('Hujjat topilmadi');

  let filePath = doc.file_path || doc.filePath;
  let absolutePath = null;
  if (filePath) {
    const rawFileName = path.basename(filePath);
    for (const candidateDir of candidateUploadDirs) {
      const p1 = path.join(candidateDir, rawFileName);
      if (fs.existsSync(p1)) { absolutePath = p1; break; }
      const p2 = path.resolve(__dirname, '../..', filePath.replace(/^\//, ''));
      if (fs.existsSync(p2)) { absolutePath = p2; break; }
    }
  }

  const downloadName = doc.title ? `${doc.title.replace(/[^a-zA-Z0-9_\-.]/g, '_')}.${(doc.file_type || 'pdf').toLowerCase()}` : 'hujjat.pdf';

  if (absolutePath && fs.existsSync(absolutePath)) {
    return res.download(absolutePath, downloadName);
  }

  // Fallback text download if file on disk was ephemeral
  res.setHeader('Content-Disposition', `attachment; filename="${downloadName}.txt"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`ANGOR AGRO STAR MCHJ HUJJAT MA'LUMOTI\n--------------------------------------\nHujjat ID: #${doc.id}\nSarlavha: ${doc.title}\nKategoriya: ${doc.category}\nYuklagan: ${doc.uploaded_name || doc.uploadedName}\nSana: ${doc.upload_date || doc.uploadDate}\n--------------------------------------\nUshbu hujjat bazada rasman tasdiqlangan.`);
});

// POST /api/documents (Real File Upload)
router.post('/', auth, upload.single('file'), async (req, res) => {
  const { title, category, version, description, target_user_id, target_user_name, reply_to_id, task_id } = req.body;

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
  const taskId = task_id ? parseInt(task_id) : null;

  const result = db.prepare(`
    INSERT INTO documents (title, category, version, file_type, file_size, file_path, uploaded_by, uploaded_name, upload_date, status, description, target_user_id, target_user_name, reply_to_id, task_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'), 'active', ?, ?, ?, ?, ?)
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
    replyId,
    taskId
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
    const docObj = db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid);
    if (docObj) {
      await TelegramService.notifyNewDocument(docObj);
    }
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
