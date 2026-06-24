const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const PUBLIC_DIR = __dirname;
const ASSETS_DIR = path.join(PUBLIC_DIR, 'assets');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webp': 'image/webp'
};

// Helper to send JSON responses
function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

// Helper to read request body
function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = [];
    req.on('data', chunk => {
      body.push(chunk);
    });
    req.on('end', () => {
      resolve(Buffer.concat(body).toString('utf-8'));
    });
    req.on('error', err => {
      reject(err);
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  // Add CORS headers for local development ease
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- API ROUTES ---

  // GET /api/pages - List all HTML pages in workspace
  if (pathname === '/api/pages' && req.method === 'GET') {
    try {
      const files = fs.readdirSync(PUBLIC_DIR);
      const htmlPages = files.filter(f => f.endsWith('.html') && f !== 'admin.html');
      sendJSON(res, htmlPages);
    } catch (err) {
      sendJSON(res, { error: 'Failed to read pages list', details: err.message }, 500);
    }
    return;
  }

  // GET /api/page?name=[filename] - Read HTML file
  if (pathname === '/api/page' && req.method === 'GET') {
    const filename = url.searchParams.get('name');
    if (!filename || !filename.endsWith('.html') || filename.includes('..')) {
      sendJSON(res, { error: 'Invalid filename' }, 400);
      return;
    }
    const filepath = path.join(PUBLIC_DIR, filename);
    if (!fs.existsSync(filepath)) {
      sendJSON(res, { error: 'File not found' }, 404);
      return;
    }
    try {
      const content = fs.readFileSync(filepath, 'utf8');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    } catch (err) {
      sendJSON(res, { error: 'Failed to read page', details: err.message }, 500);
    }
    return;
  }

  // POST /api/page - Save HTML content back to file
  if (pathname === '/api/page' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const data = JSON.parse(body);
      const { name, html } = data;

      if (!name || !name.endsWith('.html') || name.includes('..')) {
        sendJSON(res, { error: 'Invalid filename' }, 400);
        return;
      }
      if (!html) {
        sendJSON(res, { error: 'HTML content is required' }, 400);
        return;
      }

      const filepath = path.join(PUBLIC_DIR, name);
      fs.writeFileSync(filepath, html, 'utf8');
      sendJSON(res, { success: true, message: `Saved ${name} successfully` });
    } catch (err) {
      sendJSON(res, { error: 'Failed to save page', details: err.message }, 500);
    }
    return;
  }

  // GET /api/assets - List files in assets/
  if (pathname === '/api/assets' && req.method === 'GET') {
    try {
      if (!fs.existsSync(ASSETS_DIR)) {
        fs.mkdirSync(ASSETS_DIR, { recursive: true });
      }
      const files = fs.readdirSync(ASSETS_DIR);
      // Filter out system files like .DS_Store
      const assets = files.filter(f => !f.startsWith('.')).map(f => `assets/${f}`);
      sendJSON(res, assets);
    } catch (err) {
      sendJSON(res, { error: 'Failed to read assets list', details: err.message }, 500);
    }
    return;
  }

  // POST /api/upload - Upload an image via Base64 JSON
  if (pathname === '/api/upload' && req.method === 'POST') {
    try {
      const body = await getRequestBody(req);
      const data = JSON.parse(body);
      const { filename, base64 } = data;

      if (!filename || filename.includes('..')) {
        sendJSON(res, { error: 'Invalid filename' }, 400);
        return;
      }
      if (!base64 || !base64.includes(';base64,')) {
        sendJSON(res, { error: 'Invalid base64 payload' }, 400);
        return;
      }

      // Extract raw base64 string
      const base64Data = base64.split(';base64,').pop();
      const buffer = Buffer.from(base64Data, 'base64');

      if (!fs.existsSync(ASSETS_DIR)) {
        fs.mkdirSync(ASSETS_DIR, { recursive: true });
      }

      const filepath = path.join(ASSETS_DIR, filename);
      fs.writeFileSync(filepath, buffer);

      sendJSON(res, { success: true, url: `assets/${filename}` });
    } catch (err) {
      sendJSON(res, { error: 'Failed to upload file', details: err.message }, 500);
    }
    return;
  }

  // DELETE /api/asset?name=[filename] - Delete an asset
  if (pathname === '/api/asset' && req.method === 'DELETE') {
    const filename = url.searchParams.get('name');
    if (!filename || filename.includes('..')) {
      sendJSON(res, { error: 'Invalid filename' }, 400);
      return;
    }
    // Handle both "assets/file.png" and "file.png"
    const cleanName = filename.replace(/^assets\//, '');
    const filepath = path.join(ASSETS_DIR, cleanName);

    if (!fs.existsSync(filepath)) {
      sendJSON(res, { error: 'Asset not found' }, 404);
      return;
    }

    try {
      fs.unlinkSync(filepath);
      sendJSON(res, { success: true, message: `Deleted assets/${cleanName}` });
    } catch (err) {
      sendJSON(res, { error: 'Failed to delete asset', details: err.message }, 500);
    }
    return;
  }

  // --- STATIC FILE SERVING WITH CLEAN URL SUPPORT ---

  let targetPath = path.join(PUBLIC_DIR, pathname);

  // If path is a folder, check if index.html exists
  if (fs.existsSync(targetPath) && fs.statSync(targetPath).isDirectory()) {
    targetPath = path.join(targetPath, 'index.html');
  }

  // Support clean URLs: if file doesn't exist, check if appending '.html' works
  if (!fs.existsSync(targetPath)) {
    const cleanUrlPath = targetPath + '.html';
    if (fs.existsSync(cleanUrlPath) && fs.statSync(cleanUrlPath).isFile()) {
      targetPath = cleanUrlPath;
    }
  }

  // If file still doesn't exist, serve 404
  if (!fs.existsSync(targetPath) || !fs.statSync(targetPath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Page Not Found');
    return;
  }

  // Serve file
  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  try {
    const data = fs.readFileSync(targetPath);
    res.writeHead(200, { 'Content-Type': contentType });
    res.end(data);
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(`500 Internal Server Error: ${err.message}`);
  }
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}/admin`;
  console.log(`\n======================================================`);
  console.log(`🚀 Todorov Building 92 Admin Server running!`);
  console.log(`👉 Access Admin Dashboard at: ${url}`);
  console.log(`👉 Access main website at: http://localhost:${PORT}`);
  console.log(`======================================================\n`);

  // Auto-open browser on startup
  const startCommand = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'start' : 'xdg-open';
  exec(`${startCommand} ${url}`, (err) => {
    if (err) {
      console.log(`Could not automatically open browser. Please visit the URL manually.`);
    }
  });
});
