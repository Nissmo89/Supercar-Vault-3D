#!/usr/bin/env node
/* ─────────────────────────────────────────────────────────────────
   devServer.js — Smart dev server for Car Showcase
   Features:
     • Serves static files (replaces `npx serve .`)
     • Watches all project files via fs.watch
     • Full page reload for CSS / HTML / carShowcase.js changes
     • Smart HOT UPDATE for cars.js metadata-only changes:
       — If only name/brand/tagline/specs/colors changed  → pushes
         a soft update via SSE; the running app patches itself.
       — If modelPath count/order changed                 → full reload.
     • Remembers selected car across reloads via sessionStorage.
   Usage:
     node devServer.js          # default port 3000
     node devServer.js 8080     # custom port
─────────────────────────────────────────────────────────────────── */
'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');
const vm   = require('vm');
const url  = require('url');

const PORT = parseInt(process.argv[2]) || 3000;
const ROOT = __dirname;

// ── MIME map ──────────────────────────────────────────────────────
const MIME = {
  '.html':  'text/html; charset=utf-8',
  '.css':   'text/css; charset=utf-8',
  '.js':    'application/javascript; charset=utf-8',
  '.glb':   'model/gltf-binary',
  '.gltf':  'model/gltf+json',
  '.png':   'image/png',
  '.jpg':   'image/jpeg',
  '.jpeg':  'image/jpeg',
  '.svg':   'image/svg+xml',
  '.ico':   'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff':  'font/woff',
  '.ttf':   'font/ttf',
  '.hdr':   'application/octet-stream',
};

// ── SSE broadcast ──────────────────────────────────────────────────
const clients = new Set();

function broadcast(msg) {
  const data = `data: ${JSON.stringify(msg)}\n\n`;
  for (const res of clients) {
    try { res.write(data); } catch (_) { clients.delete(res); }
  }
}

// ── Extract car configs via vm sandbox ────────────────────────────
// Runs cars.js inside a sandboxed context with a fake CarShowcase
// that intercepts addCar() calls — no eval risks, no side effects.
function extractCars(code) {
  const cars = [];
  const fakeShowcase = {
    addCar(cfg) { cars.push({ ...cfg }); return this; },
    init() {},
  };
  const sandbox = {
    CarShowcase: function () { return fakeShowcase; },
    window: {},
    console: { log() {}, warn() {}, error() {} },
  };
  try {
    vm.runInNewContext(code, sandbox, { timeout: 2000 });
  } catch (e) {
    console.warn('[dev] Failed to parse cars.js:', e.message);
    return null;
  }
  return cars;
}

// ── Diff: decide hot-update vs full reload ────────────────────────
// Only metadata changed (name/brand/tagline/specs/colors) → hotUpdate
// Model path added/removed/reordered                      → reload
function diff(oldCars, newCars) {
  if (!oldCars || !newCars) return 'reload';
  if (oldCars.length !== newCars.length) return 'reload';
  for (let i = 0; i < oldCars.length; i++) {
    if (oldCars[i].modelPath !== newCars[i].modelPath) return 'reload';
  }
  return 'hotUpdate';
}

let prevCars = null;

// Prime prevCars on startup so the first save is always diffed correctly
try {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'cars.js'), 'utf8');
  prevCars = extractCars(code);
} catch (_) {}

// ── File watcher ──────────────────────────────────────────────────
let debounce = null;

function onFileChange(filename) {
  // Skip binary model files, git internals, the server itself
  if (!filename) return;
  if (/node_modules|\.git|\.glb$|\.gltf$|\.hdr$/.test(filename)) return;
  if (filename === 'devServer.js') return;

  clearTimeout(debounce);
  debounce = setTimeout(() => {
    const rel = filename.replace(/\\/g, '/'); // normalise Windows paths

    if (rel === 'js/cars.js' || rel === 'cars.js') {
      // ── Smart diff for cars.js ───────────────────────────────────
      let code;
      try { code = fs.readFileSync(path.join(ROOT, 'js', 'cars.js'), 'utf8'); } catch (_) { return; }

      const newCars = extractCars(code);
      const action  = diff(prevCars, newCars);
      prevCars = newCars;

      if (action === 'hotUpdate') {
        console.log('[dev] cars.js metadata change → hot-update (no reload)');
        broadcast({ type: 'hotUpdate', cars: newCars });
      } else {
        console.log('[dev] cars.js structural change → full reload');
        broadcast({ type: 'reload' });
      }
    } else {
      console.log(`[dev] ${rel} changed → full reload`);
      broadcast({ type: 'reload' });
    }
  }, 120);
}

function watchDir(dir) {
  try {
    fs.watch(dir, (event, filename) => {
      if (!filename) return;
      // Pass relative path from ROOT for consistent matching
      onFileChange(path.relative(ROOT, path.join(dir, filename)));
    });
  } catch (e) {
    console.warn('[dev] Cannot watch', dir, ':', e.message);
  }
}

// Watch key directories separately — fs.watch recursive not supported on Linux
watchDir(ROOT);
watchDir(path.join(ROOT, 'js'));
watchDir(path.join(ROOT, 'css'));

// ── Dev client script injected into every HTML response ───────────
const DEV_CLIENT = `
<script>
/* ── dev live-reload client ── */
(function () {
  var es = new EventSource('/__dev');
  es.onmessage = function (e) {
    var msg = JSON.parse(e.data);
    if (msg.type === 'reload') {
      console.log('[dev] reloading…');
      location.reload();
    } else if (msg.type === 'hotUpdate') {
      if (window._showcase) {
        console.log('[dev] hot-updating metadata…');
        window._showcase.hotUpdate(msg.cars);
      } else {
        location.reload(); // fallback if showcase not ready yet
      }
    }
  };
  es.onerror = function () { /* EventSource auto-reconnects */ };
})();
</script>
`;

// ── HTTP server ───────────────────────────────────────────────────
const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url);

  // SSE endpoint
  if (pathname === '/__dev') {
    res.writeHead(200, {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });
    res.write(': connected\n\n');
    clients.add(res);
    req.on('close', () => clients.delete(res));
    return;
  }

  // Resolve file path
  let filePath = path.join(ROOT, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (statErr, stat) => {
    // Directory or not found → serve index.html (SPA fallback)
    if (statErr || stat.isDirectory()) {
      filePath = path.join(ROOT, 'index.html');
    }

    fs.readFile(filePath, (readErr, data) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
        return;
      }

      const ext  = path.extname(filePath).toLowerCase();
      const mime = MIME[ext] || 'application/octet-stream';

      // Inject dev client before </body> in HTML responses
      if (ext === '.html') {
        data = Buffer.from(data.toString().replace('</body>', DEV_CLIENT + '\n</body>'));
      }

      res.writeHead(200, {
        'Content-Type': mime,
        // Disable caching for JS/CSS during development
        'Cache-Control': /\.(js|css|html)$/.test(ext) ? 'no-store' : 'public, max-age=3600',
      });
      res.end(data);
    });
  });
});

server.listen(PORT, () => {
  console.log('');
  console.log('  ┌─────────────────────────────────────────────────┐');
  console.log(`  │  🚗  Car Showcase Dev Server                    │`);
  console.log(`  │  http://localhost:${PORT}                          │`);
  console.log(`  │                                                 │`);
  console.log(`  │  cars.js metadata change  → hot-update (fast)  │`);
  console.log(`  │  modelPath / HTML / CSS   → full reload         │`);
  console.log(`  │  selected car remembered across reloads         │`);
  console.log('  └─────────────────────────────────────────────────┘');
  console.log('');
});
