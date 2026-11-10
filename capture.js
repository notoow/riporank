import { spawn } from 'child_process';
import http from 'http';
import fs from 'fs';
import path from 'path';

const rootDir = "E:\\@E-programming\\261109 liposuction-rank";
const serverPort = 8088;

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
      res.end('Not Found: ' + reqPath);
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
  console.log(`Server listening at http://localhost:${serverPort}`);

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const debugPort = 9334;
  const userDataDir = "C:\\Users\\alpha\\AppData\\Local\\Temp\\chrome-debug-" + Date.now();

  const chrome = spawn(chromePath, [
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${userDataDir}`,
    '--headless=new',
    '--disable-gpu',
    '--window-size=1600,1000',
    `http://localhost:${serverPort}/index.html`
  ]);

  function getDebugTarget() {
    return new Promise((resolve, reject) => {
      let retries = 0;
      const interval = setInterval(() => {
        http.get(`http://127.0.0.1:${debugPort}/json`, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            try {
              const list = JSON.parse(body);
              const page = list.find(t => t.type === 'page');
              if (page) {
                clearInterval(interval);
                resolve(page);
              }
            } catch(e) {}
          });
        }).on('error', () => {
          if (++retries > 30) {
            clearInterval(interval);
            reject(new Error('Timeout connecting to Chrome'));
          }
        });
      }, 200);
    });
  }

  try {
    const page = await getDebugTarget();
    console.log('Connected to page:', page.webSocketDebuggerUrl);
    const ws = new WebSocket(page.webSocketDebuggerUrl);

    let id = 1;
    const callbacks = new Map();
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Runtime.consoleAPICalled') {
        console.log('[BROWSER CONSOLE]', msg.params.type, ...msg.params.args.map(a => a.value !== undefined ? a.value : (a.description || '')));
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        console.error('[BROWSER EXCEPTION]', msg.params.exceptionDetails);
      }
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id)(msg);
        callbacks.delete(msg.id);
      }
    };

    function send(method, params = {}) {
      return new Promise(resolve => {
        const msgId = id++;
        callbacks.set(msgId, resolve);
        ws.send(JSON.stringify({ id: msgId, method, params }));
      });
    }

    await new Promise(r => ws.onopen = r);
    await send('Runtime.enable');
    await send('Page.enable');

    console.log('Waiting 6 seconds for 3D models to load and render...');
    await new Promise(r => setTimeout(r, 6000));

    const checkRes = await send('Runtime.evaluate', {
      expression: `(() => {
        const h = window.app.scene.modelHolders['lamborghini'];
        if (!h) return 'lamborghini holder null';
        h.updateMatrixWorld(true);
        let minY = Infinity, maxY = -Infinity;
        h.traverse(m => {
          if (m.isMesh && m.geometry) {
            m.geometry.computeBoundingBox();
            const b = m.geometry.boundingBox;
            const v1 = b.min.clone().applyMatrix4(m.matrixWorld);
            const v2 = b.max.clone().applyMatrix4(m.matrixWorld);
            minY = Math.min(minY, v1.y, v2.y);
            maxY = Math.max(maxY, v1.y, v2.y);
          }
        });
        return JSON.stringify({
          holderPos: h.position,
          holderScale: h.scale,
          minY, maxY,
          height: maxY - minY
        });
      })()`,
      returnByValue: true
    });
    console.log('CHECK_RES_FULL:', checkRes.result?.result?.value);

    const snap = await send('Page.captureScreenshot', { format: 'png' });
    if (snap.result && snap.result.data) {
      fs.writeFileSync('browser_capture.png', Buffer.from(snap.result.data, 'base64'));
      console.log('Screenshot saved to browser_capture.png');
    }

    ws.close();
    chrome.kill();
    server.close();
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    chrome.kill();
    server.close();
    process.exit(1);
  }
});
