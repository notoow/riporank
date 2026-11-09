import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const rootDir = "E:\\@E-programming\\261109 liposuction-rank";
const serverPort = 8089;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';
  const filePath = path.join(rootDir, reqPath);

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': mimeTypes[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

server.listen(serverPort, async () => {
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const debugPort = 9335;
  const userDataDir = "C:\\Users\\alpha\\AppData\\Local\\Temp\\chrome-debug-" + Date.now();

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    `http://localhost:${serverPort}/index.html`
  ]);

  function getTarget() {
    return new Promise(resolve => {
      const it = setInterval(() => {
        http.get(`http://127.0.0.1:${debugPort}/json`, res => {
          let body = '';
          res.on('data', d => body += d);
          res.on('end', () => {
            try {
              const list = JSON.parse(body);
              const p = list.find(t => t.type === 'page');
              if (p) { clearInterval(it); resolve(p); }
            } catch(e) {}
          });
        }).on('error', () => {});
      }, 200);
    });
  }

  const p = await getTarget();
  const ws = new WebSocket(p.webSocketDebuggerUrl);
  let id = 1;
  const send = (m, params = {}) => new Promise(r => {
    const msgId = id++;
    const h = ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id === msgId) {
        ws.removeEventListener('message', h);
        r(msg);
      }
    };
    ws.addEventListener('message', h);
    ws.send(JSON.stringify({ id: msgId, method: m, params }));
  });

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');

  console.log('Waiting 5s for models...');
  await new Promise(r => setTimeout(r, 5000));

  const evalRes = await send('Runtime.evaluate', {
    expression: `(() => {
      try {
        const info = { cybertruckMeshes: [], holders: {} };
        const scene = window.app.scene;
        const ct = scene.models.cybertruck;
        if (ct) {
          ct.traverse(c => {
            if (c.isMesh) {
              info.cybertruckMeshes.push({
                name: c.name,
                matName: c.material ? c.material.name : '',
                col: c.material && c.material.color ? '#' + c.material.color.getHexString() : '',
                metalness: c.material ? c.material.metalness : null,
                roughness: c.material ? c.material.roughness : null
              });
            }
          });
        }
        for (const [k, v] of Object.entries(scene.modelHolders)) {
          info.holders[k] = {
            pos: [v.position.x, v.position.y, v.position.z],
            scale: [v.scale.x, v.scale.y, v.scale.z],
            bounds: scene.worldBounds[k],
            visible: v.visible
          };
        }
        return JSON.stringify(info, null, 2);
      } catch(e) {
        return 'ERR: ' + e.message;
      }
    })()`,
    returnByValue: true
  });

  const parsed = JSON.parse(evalRes.result.result.value);
  console.log('HOLDERS & BOUNDS:', JSON.stringify(parsed.holders, null, 2));
  console.log('CYBERTRUCK MESHES:', JSON.stringify(parsed.cybertruckMeshes, null, 2));

  ws.close();
  chrome.kill();
  server.close();
  process.exit(0);
});
