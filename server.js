#!/usr/bin/env node
'use strict';

// Tiny static file server for the web version of Snake. No dependencies.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PUBLIC_DIR = path.join(__dirname, 'public');
// Vue is installed with npm and served from node_modules, so there's no CDN or build step.
const VUE_FILE = path.join(__dirname, 'node_modules', 'vue', 'dist', 'vue.global.prod.js');

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

// Map a URL path to a file on disk, or null if it would escape the public folder.
function resolveFile(urlPath) {
  // game.js is shared with the terminal version, so it lives in the project root.
  if (urlPath === '/game.js') return path.join(__dirname, 'game.js');
  if (urlPath === '/vendor/vue.js') return VUE_FILE;
  const rel = urlPath === '/' ? 'index.html' : urlPath.replace(/^\/+/, '');
  const file = path.join(PUBLIC_DIR, rel);
  return file.startsWith(PUBLIC_DIR + path.sep) ? file : null;
}

function send(res, status, body, type = 'text/plain; charset=utf-8') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-cache' });
  res.end(body);
}

function createServer() {
  return http.createServer((req, res) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.setHeader('Allow', 'GET, HEAD');
      return send(res, 405, 'Method not allowed');
    }

    let urlPath;
    try {
      urlPath = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      return send(res, 400, 'Bad request');
    }
    if (urlPath.includes('\0')) return send(res, 400, 'Bad request');

    const file = resolveFile(urlPath);
    if (!file) return send(res, 404, 'Not found');

    fs.readFile(file, (err, data) => {
      if (err) return send(res, 404, 'Not found');
      const type = TYPES[path.extname(file)] || 'application/octet-stream';
      send(res, 200, req.method === 'HEAD' ? '' : data, type);
    });
  });
}

function main() {
  const port = Number(process.env.PORT) || 3000;
  if (!fs.existsSync(VUE_FILE)) {
    console.error('Vue is not installed yet. Run: npm install');
    process.exit(1);
  }
  const server = createServer();
  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${port} is already in use. Try another: PORT=3001 node server.js`);
    } else {
      console.error(err.message);
    }
    process.exit(1);
  });
  server.listen(port, () => {
    console.log(`Snake is running at http://localhost:${port}  (Ctrl+C to stop)`);
  });
}

if (require.main === module) main();

module.exports = { createServer, resolveFile };
