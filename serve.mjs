import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(process.argv[3] || path.dirname(fileURLToPath(import.meta.url)));
const port = Number(process.argv[2] || 5173);
const mime = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.woff2':'font/woff2','.txt':'text/plain; charset=utf-8','.md':'text/plain; charset=utf-8'};
const server = http.createServer((req,res) => {
  try {
    const urlPath = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root, '.' + urlPath + (urlPath.endsWith('/') ? 'index.html' : ''));
    const relative = path.relative(root,file);
    if (relative.startsWith('..') || path.isAbsolute(relative) || relative.split(path.sep).some(s=>s.startsWith('.'))) { res.writeHead(403);res.end('Forbidden');return; }
    if (!['GET','HEAD'].includes(req.method)) {res.writeHead(405);res.end();return;}
    const data = fs.readFileSync(file);
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    res.end(req.method === 'HEAD' ? undefined : data);
  } catch {res.writeHead(404);res.end('Not found');}
});
server.on('error', error => {console.error(error.code === 'EADDRINUSE' ? `Port ${port} is busy. Try: node serve.mjs ${port+1}` : error.message);process.exitCode=1;});
server.listen(port,'127.0.0.1',()=>console.log(`Advaita: http://127.0.0.1:${port}/ (Ctrl+C to stop)`));
