// Root Entry Point for Cloud Deployment (Render / Railway / Vercel)
const path = require('path');
const fs   = require('fs');

const serverPath = path.join(__dirname, 'server', 'index.js');
if (fs.existsSync(serverPath)) {
  require(serverPath);
} else {
  require('./server/index.js');
}
