/**
 * server.js - 零依赖本地静态服务器（仅使用 Node.js 内置模块）
 *
 * 用途：以浏览器方式运行 MBTI-Cocktail，无需安装任何 npm 包。
 * 用法：node server.js  然后浏览器打开 http://localhost:8000
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, 'src');
const PORT = 8000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent(req.url.split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(SRC_DIR, urlPath);

  // 防止路径穿越
  if (!filePath.startsWith(SRC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found: ' + urlPath);
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('MBTI-Cocktail 已启动');
  console.log('请在浏览器打开: http://localhost:' + PORT);
  console.log('按 Ctrl+C 停止服务器');
});
