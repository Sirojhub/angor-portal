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

const ALLOWED_EXTENSIONS = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.png', '.jpg', '.jpeg', '.zip', '.txt'];

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB maks
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return cb(new Error(`Ruxsat etilmagan fayl turi: ${ext}. Ruxsat etilgan: ${ALLOWED_EXTENSIONS.join(', ')}`));
    }
    cb(null, true);
  }
});

function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function generateDocNumber(database) {
  const year = new Date().getFullYear();
  const allDocs = database.prepare('SELECT * FROM documents ORDER BY upload_date DESC').all();
  const thisYearDocs = allDocs.filter(d => d.doc_number && d.doc_number.startsWith(`${year}-`));
  const maxNum = thisYearDocs.reduce((max, d) => {
    const num = parseInt((d.doc_number || '').split('-')[1], 10);
    return isNaN(num) ? max : Math.max(max, num);
  }, 0);
  const nextNum = String(maxNum + 1).padStart(3, '0');
  return `${year}-${nextNum}`;
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

// Task 2.2 — Document Access Control Rule Helper
function canAccessDocument(doc, user) {
  if (!user) return false;
  if (user.role === 'director') return true; // Director sees everything

  const targetId = doc.target_user_id || doc.targetUserId;
  // Public document (no target_user_id) -> visible to all authenticated users
  if (!targetId || targetId === null || targetId === 0 || targetId === 'null') return true;

  // Assigned specifically to user or uploaded by user
  if (parseInt(targetId) === parseInt(user.id)) return true;
  if (parseInt(doc.uploaded_by || doc.uploadedBy) === parseInt(user.id)) return true;

  return false;
}

// GET /api/documents (Task 2.2: Filtered by user access rights)
router.get('/', auth, (req, res) => {
  const { category, task_id } = req.query;
  let docs = db.prepare('SELECT * FROM documents ORDER BY upload_date DESC').all();

  // Filter documents so confidential target_user_id documents remain hidden
  docs = docs.filter(d => canAccessDocument(d, req.user));

  if (category && category !== 'all') {
    docs = docs.filter(d => d.category === category);
  }
  if (task_id) {
    docs = docs.filter(d => d.task_id === parseInt(task_id) || d.taskId === parseInt(task_id));
  }
  res.json(docs);
});

// GET /api/documents/:id/file (View file inline - Task 2.1 & 2.2: Auth + RBAC)
router.get('/:id/file', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).send('Hujjat topilmadi');

  if (!canAccessDocument(doc, req.user)) {
    return res.status(403).json({ error: "Bu hujjatni ko'rish huquqingiz yo'q" });
  }

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
    return res.status(404).json({ error: 'Fayl serverda topilmadi. Ehtimol, server qayta ishga tushganda fayl yo\'qolgan (Render bepul tarifida vaqtinchalik xotira ishlatiladi).' });
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

// GET /api/documents/:id/download (Force File Download - Task 2.1 & 2.2: Auth + RBAC)
router.get('/:id/download', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).send('Hujjat topilmadi');

  if (!canAccessDocument(doc, req.user)) {
    return res.status(403).json({ error: "Bu hujjatni ko'rish huquqingiz yo'q" });
  }

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

  if (!absolutePath || !fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'Fayl serverda topilmadi. Ehtimol, server qayta ishga tushganda fayl yo\'qolgan (Render bepul tarifida vaqtinchalik xotira ishlatiladi).' });
  }

  return res.download(absolutePath, downloadName);
});

// POST /api/documents (Real File Upload)
router.post('/', auth, (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
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

  let targetId = target_user_id ? parseInt(target_user_id) : null;
  const replyId = reply_to_id ? parseInt(reply_to_id) : null;
  const taskId = task_id ? parseInt(task_id) : null;

  // Audit Fix 4: Auto-bind task attachments to opposite party (Director <-> Employee) for 2-way visibility
  if (taskId && !targetId) {
    try {
      const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
      if (task) {
        if (req.user.id === task.assigned_to) {
          targetId = task.created_by || 1; // Send to Director
        } else {
          targetId = task.assigned_to; // Send to Employee
        }
      }
    } catch (e) {}
  }

  const docNumber = generateDocNumber(db);

  const result = db.prepare(`
    INSERT INTO documents (title, category, version, file_type, file_size, file_path, uploaded_by, uploaded_name, upload_date, status, description, target_user_id, target_user_name, reply_to_id, task_id, doc_number)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, date('now'), 'active', ?, ?, ?, ?, ?, ?)
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
    taskId,
    docNumber
  );

  db.prepare(`INSERT INTO activity_logs (user_id, user_name, action, model, model_id, description) VALUES (?,?,?,?,?,?)`).run(
    req.user.id, req.user.name, 'upload', 'document', result.lastInsertRowid, `Yangi hujjat yukladi: «${title}» (${fileType}, ${fileSize})${target_user_name ? ' 🎯 Mas\'ul: '+target_user_name : ''}`
  );

  if (targetId && targetId !== req.user.id) {
    db.prepare(`INSERT INTO notifications (user_id, title, message, type) VALUES (?,?,?,?)`).run(
      targetId, 'Yangi hujjat biriktirildi', `${req.user.name} sizga «${title}» hujjatini biriktirdi`, 'info'
    );
  }

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

// DELETE /api/documents/:id (Task 2.3: Only uploader or Director can delete)
router.delete('/:id', auth, (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
  if (!doc) return res.status(404).json({ error: 'Hujjat topilmadi' });

  const isOwner = parseInt(doc.uploaded_by || doc.uploadedBy) === parseInt(req.user.id);
  const isDirector = req.user.role === 'director';

  if (!isOwner && !isDirector) {
    return res.status(403).json({ error: 'Ushbu hujjatni o\'chirish huquqingiz yo\'q' });
  }

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
