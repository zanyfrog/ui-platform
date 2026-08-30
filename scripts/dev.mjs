import { spawn } from 'node:child_process';
import http from 'node:http';
import net from 'node:net';
import { createServer as createViteServer } from 'vite';

function freePort(preferred) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', () => {
      const fallback = net.createServer();
      fallback.once('error', reject);
      fallback.listen(0, '127.0.0.1', () => {
        const address = fallback.address();
        const port = typeof address === 'object' && address ? address.port : preferred + 1;
        fallback.close(() => resolve(port));
      });
    });
    server.listen(preferred, '127.0.0.1', () => server.close(() => resolve(preferred)));
  });
}

function quoteCmdArg(value) {
  if (!/[\s"&|<>^()]/.test(value)) return value;
  return `"${value.replace(/"/g, '""')}"`;
}

function spawnNpm(args, options = {}) {
  const npmExecPath = process.env.npm_execpath;

  if (npmExecPath) {
    return spawn(process.execPath, [npmExecPath, ...args], options);
  }

  if (process.platform === 'win32') {
    const comspec = process.env.ComSpec || process.env.COMSPEC || 'cmd.exe';
    const command = ['npm', ...args].map(quoteCmdArg).join(' ');
    return spawn(comspec, ['/d', '/s', '/c', command], options);
  }

  return spawn('npm', args, options);
}

function waitForPort(port, { host = '127.0.0.1', timeoutMs = 10000 } = {}) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    function tryConnect() {
      const socket = net.createConnection({ host, port });

      socket.once('connect', () => {
        socket.end();
        resolve();
      });

      socket.once('error', () => {
        socket.destroy();
        if (Date.now() - startedAt >= timeoutMs) {
          reject(new Error(`Timed out waiting for API on ${host}:${port}.`));
          return;
        }
        setTimeout(tryConnect, 100);
      });
    }

    tryConnect();
  });
}

async function previewForApp(key) {
  return new Promise((resolve, reject) => {
    const request = http.request({
      hostname: '127.0.0.1',
      port: apiPort,
      path: `/api/apps/${encodeURIComponent(key)}/preview`,
      method: 'POST',
      headers: { 'content-type': 'application/json' },
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if ((response.statusCode || 500) < 200 || (response.statusCode || 500) >= 300) {
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(text));
        } catch (error) {
          reject(error);
        }
      });
    });
    request.once('error', reject);
    request.end();
  });
}

async function proxyToPreview(req, res, targetUrl, basePath) {
  const target = new URL(targetUrl);
  const incomingUrl = req.url || '/';
  const apiBasePath = `${basePath}/api`;
  let proxiedPath = incomingUrl.startsWith(apiBasePath) ? incomingUrl.slice(basePath.length) : incomingUrl;
  if (!proxiedPath || proxiedPath[0] !== '/') proxiedPath = `/${proxiedPath}`;
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  const body = Buffer.concat(chunks);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      await new Promise((resolve, reject) => {
        const proxy = http.request({
          hostname: target.hostname,
          port: target.port,
          path: proxiedPath,
          method: req.method,
          headers: { ...req.headers, host: target.host },
        }, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
          proxyRes.pipe(res);
          proxyRes.once('end', resolve);
        });

        proxy.once('error', reject);
        proxy.end(body);
      });
      return;
    } catch (error) {
      if (attempt === 19) {
        if (!res.headersSent) res.writeHead(502, { 'content-type': 'text/plain; charset=utf-8' });
        res.end(`Could not proxy app preview: ${error instanceof Error ? error.message : String(error)}`);
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
}

function appPreviewProxyMiddleware() {
  const platformPaths = new Set(['api', 'assets', 'node_modules', 'src']);
  return async (req, res, next) => {
    const pathname = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`).pathname;
    const key = pathname.split('/').filter(Boolean)[0];
    if (!key || platformPaths.has(key) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
      next();
      return;
    }

    const preview = await previewForApp(key).catch(() => null);
    if (!preview?.url) {
      next();
      return;
    }

    if (pathname === `/${key}`) {
      const suffix = req.url?.slice(pathname.length) ?? '';
      res.writeHead(302, { location: `/${key}/${suffix}` });
      res.end();
      return;
    }

    void proxyToPreview(req, res, preview.url, `/${key}`);
  };
}

const apiPort = Number(process.env.UI_PLATFORM_API_PORT || await freePort(4090));
const uiPort = Number(process.env.UI_PLATFORM_UI_PORT || await freePort(5174));

process.env.UI_PLATFORM_API_PORT = String(apiPort);
process.env.UI_PLATFORM_UI_PORT = String(uiPort);

const env = {
  ...process.env,
  UI_PLATFORM_API_PORT: String(apiPort),
  UI_PLATFORM_UI_PORT: String(uiPort),
};

// Start the TypeScript API through the package script.
// Using an npm script avoids npm-exec parsing differences on Windows/Node 24.
const api = spawnNpm(['run', 'dev:api'], {
  stdio: 'inherit',
  env,
});

api.once('error', (error) => {
  console.error('Failed to start UI Platform API:', error);
});

api.once('exit', (code, signal) => {
  if (code && code !== 0) {
    console.error(`UI Platform API exited with code ${code}${signal ? ` (${signal})` : ''}.`);
  }
});

await waitForPort(apiPort);

// Start Vite programmatically in this process.
// This avoids spawning a second npm/npx/.cmd process on Windows.
const vite = await createViteServer({
  server: { middlewareMode: true },
});

const appPreviewProxy = appPreviewProxyMiddleware();
const front = http.createServer((req, res) => {
  appPreviewProxy(req, res, () => vite.middlewares(req, res, () => {
    if (!res.headersSent) res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  }));
});

await new Promise((resolve, reject) => {
  front.once('error', reject);
  front.listen(uiPort, '0.0.0.0', resolve);
});

console.log('');
console.log(`UI Platform: http://localhost:${uiPort}`);
console.log(`UI Platform API: http://localhost:${apiPort}`);

let stopping = false;
async function stop() {
  if (stopping) return;
  stopping = true;

  try {
    await vite.close();
  } catch {}

  front.close();

  if (!api.killed) {
    api.kill('SIGTERM');
  }
}

process.on('SIGINT', async () => {
  await stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stop();
  process.exit(0);
});
