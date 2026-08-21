// ============================================================
// ANGOR AGRO STAR PORTAL — Backend Server
// ============================================================
const path    = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });
const express = require('express');
const cors    = require('cors');
const { seedDatabase } = require('./db/seed');

const app  = express();
const PORT = process.env.PORT || 3000;

// Database seed
seedDatabase();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const fs = require('fs');

// Serve frontend static files
app.use(express.static(path.join(__dirname, '..')));
app.use(express.static(process.cwd()));
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API Routes
app.use('/api/auth',          require('./routes/auth'));
app.use('/api/tasks',         require('./routes/tasks'));
app.use('/api/clients',       require('./routes/clients'));
app.use('/api/employees',     require('./routes/employees'));
app.use('/api/documents',     require('./routes/documents'));
app.use('/api/warehouse',     require('./routes/warehouse'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/logs',          require('./routes/logs'));
app.use('/api/telegram',      require('./routes/telegram'));

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
