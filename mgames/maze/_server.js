const http = require('http');
const fs = require('fs');
const path = require('path');
const s = http.createServer((req, res) => {
    let f = path.join('.', req.url === '/' ? '/index.html' : req.url);
    try {
        const d = fs.readFileSync(f);
        const ext = path.extname(f);
        const ct = { html: 'text/html', css: 'text/css', js: 'application/javascript' }[ext.slice(1)] || 'text/plain';
        res.writeHead(200, { 'Content-Type': ct });
        res.end(d);
    } catch (e) { res.writeHead(404); res.end('Not found'); }
});
s.listen(8765, () => console.log('Serving on http://localhost:8765'));
