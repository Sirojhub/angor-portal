// ============================================================
// ANGOR AGRO STAR PORTAL — Backend Server
// ============================================================
const path    = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');
const app  = express();
const PORT = process.env.PORT || 3000;

function loadModule(relPath) {
  const candidates = [
    `./server/${relPath}`,
    `./${relPath}`,
    `../server/${relPath}`
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') throw e;
    }
  }
  return require(`./${relPath}`);
}

const { seedDatabase } = loadModule('db/seed');

// Database seed
seedDatabase();

// Middleware
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fs = require('fs');

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(process.cwd()));
app.use(express.static(__dirname));

function loadRoute(name) {
  const candidates = [
    `./server/routes/${name}`,
    `../server/routes/${name}`,
    `./routes/${name}`
  ];
  for (const c of candidates) {
    try {
      return require(c);
    } catch (e) {
      if (e.code !== 'MODULE_NOT_FOUND') throw e;
    }
  }
  return require(`./routes/${name}`);
}

// API Routes
app.use('/api/auth',          loadRoute('auth'));
app.use('/api/tasks',         loadRoute('tasks'));
app.use('/api/clients',       loadRoute('clients'));
app.use('/api/employees',     loadRoute('employees'));
app.use('/api/documents',     loadRoute('documents'));
app.use('/api/warehouse',     loadRoute('warehouse'));
app.use('/api/notifications', loadRoute('notifications'));
app.use('/api/logs',          loadRoute('logs'));
app.use('/api/telegram',      loadRoute('telegram'));

// Fallback to index.html for SPA / root
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API topilmadi' });
  }
  const candidates = [
    path.join(__dirname, '..', 'index.html'),
    path.join(__dirname, 'index.html'),
    path.join(process.cwd(), 'index.html'),
    path.join(process.cwd(), 'server', 'index.html')
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      return res.sendFile(p);
    }
  }
  res.sendFile(candidates[0]);
});

// Start Server
app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(` 🌾 ANGOR AGRO STAR PORTAL SERVER ISHGA TUSHDI!`);
  console.log(` 🚀 Server manzili: http://localhost:${PORT}`);
  console.log(`================================================`);
});

// Self-ping to prevent Render Free Tier Cold-Start delays (Keeps server awake 24/7)
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  setInterval(() => {
    try {
      const https = require('https');
      https.get('https://angor-portal.onrender.com/api/logs', (res) => {}).on('error', () => {});
    } catch (e) {}
  }, 9 * 60 * 1000); // Every 9 minutes
}
