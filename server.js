/**
 * Rijschool Omary — сайт + бэкенд для заявок.
 * Без зависимостей: запускается просто `node server.js`.
 *
 * Заявки сохраняются в data/submissions.json.
 * Просмотр заявок: http://localhost:5500/admin?key=АДМИН_КЛЮЧ
 * Ключ задаётся переменной окружения ADMIN_KEY (по умолчанию см. ниже — смени его!).
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 5500;
const ADMIN_KEY = process.env.ADMIN_KEY || 'omary-admin-2026';

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const DATA_FILE = path.join(DATA_DIR, 'submissions.json');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.woff2': 'font/woff2',
};

// Файлы, которые нельзя отдавать наружу
const BLOCKED = ['/data', '/server.js', '/.claude', '/README.md', '/.gitignore'];

function readSubmissions() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveSubmission(entry) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const all = readSubmissions();
  all.push(entry);
  fs.writeFileSync(DATA_FILE, JSON.stringify(all, null, 2), 'utf8');
  return all.length;
}

// Простой rate-limit: максимум 5 заявок за 10 минут с одного IP
const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const windowMs = 10 * 60 * 1000;
  const recent = (hits.get(ip) || []).filter((t) => now - t < windowMs);
  if (recent.length >= 5) return true;
  recent.push(now);
  hits.set(ip, recent);
  return false;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function sendJson(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(obj));
}

function clientIp(req) {
  const fwd = req.headers['x-forwarded-for'];
  return (fwd ? String(fwd).split(',')[0].trim() : req.socket.remoteAddress) || 'unknown';
}

function handleContact(req, res) {
  const ip = clientIp(req);

  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 64 * 1024) req.destroy(); // защита от слишком больших запросов
  });
  req.on('end', () => {
    let data;
    try {
      data = JSON.parse(body);
    } catch {
      return sendJson(res, 400, { error: 'Ongeldige aanvraag.' });
    }

    // Honeypot: боты заполняют скрытое поле — делаем вид, что всё ок, но не сохраняем
    if (data.website) return sendJson(res, 200, { ok: true });

    if (rateLimited(ip)) {
      return sendJson(res, 429, { error: 'Te veel berichten. Probeer het later opnieuw.' });
    }

    const str = (v, max) => String(v || '').trim().slice(0, max);
    const naam = str(data.naam, 100);
    const email = str(data.email, 200);
    const telefoon = str(data.telefoon, 30);
    const onderwerp = str(data.onderwerp, 200);
    const typeLes = ['Schakel', 'Automaat'].includes(data.typeLes) ? data.typeLes : '';
    const bericht = str(data.bericht, 3000);
    const lang = ['nl', 'en', 'fa', 'ru'].includes(data.lang) ? data.lang : 'nl';

    if (naam.length < 2) return sendJson(res, 400, { error: 'Vul je naam in.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))
      return sendJson(res, 400, { error: 'Vul een geldig e-mailadres in.' });
    if (!/^[0-9+()\-\s]{6,30}$/.test(telefoon))
      return sendJson(res, 400, { error: 'Vul een geldig telefoonnummer in.' });

    const entry = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      datum: new Date().toISOString(),
      naam,
      email,
      telefoon,
      onderwerp,
      typeLes,
      bericht,
      lang,
      ip,
    };

    try {
      const total = saveSubmission(entry);
      console.log(`[aanvraag #${total}] ${entry.datum} — ${naam} <${email}> ${telefoon}`);
      sendJson(res, 200, { ok: true });
    } catch (err) {
      console.error('Opslaan mislukt:', err);
      sendJson(res, 500, { error: 'Opslaan mislukt. Probeer het later opnieuw.' });
    }
  });
}

function adminPage(res) {
  const subs = readSubmissions().slice().reverse();
  const rows = subs
    .map(
      (s) => `<tr>
        <td>${escapeHtml(new Date(s.datum).toLocaleString('nl-NL'))}</td>
        <td>${escapeHtml(s.naam)}</td>
        <td><a href="mailto:${escapeHtml(s.email)}">${escapeHtml(s.email)}</a></td>
        <td><a href="tel:${escapeHtml(s.telefoon)}">${escapeHtml(s.telefoon)}</a></td>
        <td>${escapeHtml(s.typeLes)}</td>
        <td>${escapeHtml((s.lang || 'nl').toUpperCase())}</td>
        <td>${escapeHtml(s.onderwerp)}</td>
        <td class="msg">${escapeHtml(s.bericht)}</td>
      </tr>`
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Aanvragen — Rijschool Omary</title>
<style>
  body{font-family:Inter,-apple-system,'Segoe UI',sans-serif;background:#eef1f5;color:#0f1319;margin:0;padding:32px 20px}
  .wrap{max-width:1200px;margin:0 auto}
  h1{font-size:22px;letter-spacing:-.02em}
  p.sub{color:#5a6474;font-size:14px;margin:6px 0 24px}
  .card{background:rgba(255,255,255,.8);border:1px solid rgba(255,255,255,.75);border-radius:20px;
    box-shadow:0 12px 32px -12px rgba(16,24,40,.12);padding:8px 20px;overflow-x:auto}
  table{width:100%;border-collapse:collapse;font-size:13.5px}
  th{text-align:left;color:#8a93a3;font-weight:600;text-transform:uppercase;font-size:11px;letter-spacing:.08em}
  th,td{padding:12px 10px;border-bottom:1px solid rgba(15,19,25,.08);vertical-align:top}
  tr:last-child td{border-bottom:none}
  td.msg{max-width:340px;white-space:pre-wrap;word-break:break-word;color:#5a6474}
  a{color:#2f6be4;text-decoration:none}
  .export{display:inline-block;margin-top:18px;font-size:13.5px}
  .empty{padding:40px;text-align:center;color:#8a93a3}
</style></head><body><div class="wrap">
<h1>Aanvragen via de website</h1>
<p class="sub">Totaal: ${subs.length}</p>
<div class="card">
${
  subs.length
    ? `<table><thead><tr><th>Datum</th><th>Naam</th><th>E-mail</th><th>Telefoon</th><th>Les</th><th>Taal</th><th>Onderwerp</th><th>Bericht</th></tr></thead><tbody>${rows}</tbody></table>`
    : '<p class="empty">Nog geen aanvragen.</p>'
}
</div>
<a class="export" href="/admin/export?key=${encodeURIComponent(ADMIN_KEY)}">Download als JSON</a>
</div></body></html>`;

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

function serveStatic(req, res, pathname) {
  let p = pathname;
  if (p === '/') p = '/index.html';

  if (BLOCKED.some((b) => p === b || p.startsWith(b + '/'))) {
    res.writeHead(404);
    return res.end('Not found');
  }

  const filePath = path.join(ROOT, path.normalize(p));
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found');
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = decodeURIComponent(url.pathname);

  if (pathname === '/api/contact' && req.method === 'POST') return handleContact(req, res);

  if (pathname === '/admin' || pathname === '/admin/export') {
    if (url.searchParams.get('key') !== ADMIN_KEY) {
      res.writeHead(401, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Geen toegang. Voeg ?key=... toe aan het adres.');
    }
    if (pathname === '/admin/export') {
      res.writeHead(200, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="submissions.json"',
      });
      return res.end(JSON.stringify(readSubmissions(), null, 2));
    }
    return adminPage(res);
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405);
    return res.end('Method not allowed');
  }

  serveStatic(req, res, pathname);
});

server.listen(PORT, () => {
  console.log(`Site:  http://localhost:${PORT}`);
  console.log(`Admin: http://localhost:${PORT}/admin?key=${ADMIN_KEY}`);
  console.log(`Заявки сохраняются в: ${DATA_FILE}`);
});
