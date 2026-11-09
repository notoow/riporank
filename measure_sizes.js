import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const rootDir = "E:\\@E-programming\\261109 liposuction-rank";
const serverPort = 8090;
const mimeTypes = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json', '.bin': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not Found'); return; }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream', 'Access-Control-Allow-Origin': '*' });
    res.end(data);
  });
});

server.listen(serverPort, async () => {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const debugPort = 9340;
  const userDataDir = "C:\\Users\\alpha\\AppData\\Local\\Temp\\chrome-debug-" + Date.now();
  const chrome = spawn(chromePath, [`--remote-debugging-port=${debugPort}`, `--user-data-dir=${userDataDir}`, '--headless=new', '--disable-gpu', `http://localhost:${serverPort}/index.html`]);

  function getTarget() {
    return new Promise(resolve => {
      const it = setInterval(() => {
        http.get(`http://127.0.0.1:${debugPort}/json`, res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            try { const list = JSON.parse(body); const pp = list.find(t => t.type === 'page'); if (pp) { clearInterval(it); resolve(pp); } } catch(e) {}
          });
        }).on('error', () => {});
      }, 200);
    });
  }

  const pg = await getTarget();
  const ws = new WebSocket(pg.webSocketDebuggerUrl);
  let id = 1;
  const send = (m, params = {}) => new Promise(r => {
    const msgId = id++;
    const h = ev => { const msg = JSON.parse(ev.data); if (msg.id === msgId) { ws.removeEventListener('message', h); r(msg); } };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: msgId, method: m, params }));
  });
  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');
  await new Promise(r => setTimeout(r, 7000));

  const evalRes = await send('Runtime.evaluate', {
    expression: `(function() {
      try {
        var scene = window.app.scene;
        var result = {};
        var V3 = window.THREE.Vector3;
        var B3 = window.THREE.Box3;
        for (var k in scene.modelHolders) {
          var holder = scene.modelHolders[k];
          var box = new B3().setFromObject(holder);
          var sz = box.getSize(new V3());
          result[k] = {
            posX: +holder.position.x.toFixed(3),
            minX: +box.min.x.toFixed(3),
            maxX: +box.max.x.toFixed(3),
            szX: +sz.x.toFixed(3),
            szY: +sz.y.toFixed(3),
            szZ: +sz.z.toFixed(3),
            scale: +holder.scale.x.toFixed(4)
          };
        }
        return JSON.stringify(result);
      } catch(e) { return '"ERR: ' + e.message + '"'; }
    })()`,
    returnByValue: true
  });

  console.log('RAW:', evalRes.result.result.value);
  ws.close(); chrome.kill(); server.close(); process.exit(0);
});
