import type { ChildProcess } from 'node:child_process';
import net from 'node:net';
import { appPath, getApp } from './applications.js';
import { spawnNpm } from './npm-process.js';

interface RunningPreview { child: ChildProcess; uiPort: number; apiPort: number; }
const previews = new Map<string, RunningPreview>();
const startingPreviews = new Map<string, Promise<{ url: string; apiUrl: string }>>();

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : 0;
      server.close(() => resolve(port));
    });
  });
}

async function waitFor(url: string, timeoutMs = 15000): Promise<void> {
  const end = Date.now() + timeoutMs;
  while (Date.now() < end) {
    try { const response = await fetch(url); if (response.ok) return; } catch {}
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview did not become ready: ${url}`);
}

export async function ensurePreview(key: string): Promise<{ url: string; apiUrl: string }> {
  const app = await getApp(key);
  if (!app.valid) throw new Error(`App is invalid: ${app.issues.join(', ')}`);
  if (app.status !== 'active') throw new Error('Disabled applications cannot start a normal preview.');
  const existing = previews.get(key);
  if (existing && !existing.child.killed) {
    return { url: `http://127.0.0.1:${existing.uiPort}`, apiUrl: `http://127.0.0.1:${existing.apiPort}` };
  }
  const starting = startingPreviews.get(key);
  if (starting) return starting;

  const started = startPreview(key);
  startingPreviews.set(key, started);
  try {
    return await started;
  } finally {
    startingPreviews.delete(key);
  }
}

async function startPreview(key: string): Promise<{ url: string; apiUrl: string }> {
  const uiPort = await freePort();
  const apiPort = await freePort();
  const child = spawnNpm(['run', 'dev'], {
    cwd: appPath(key),
    stdio: 'inherit',
    env: { ...process.env, UI_PREVIEW_PORT: String(uiPort), APP_API_PORT: String(apiPort), UI_APP_BASE: `/${key}/` },
  });
  previews.set(key, { child, uiPort, apiPort });
  child.once('exit', () => previews.delete(key));
  await Promise.race([
    waitFor(`http://127.0.0.1:${uiPort}`),
    new Promise<never>((_, reject) => child.once('exit', (code, signal) => reject(new Error(`Preview exited before becoming ready${code === null ? '' : ` with code ${code}`}${signal ? ` (${signal})` : ''}.`)))),
  ]);
  return { url: `http://127.0.0.1:${uiPort}`, apiUrl: `http://127.0.0.1:${apiPort}` };
}

export function stopPreview(key: string): void {
  const running = previews.get(key);
  if (running && !running.child.killed) running.child.kill('SIGTERM');
  previews.delete(key);
}

export function stopAllPreviews(): void {
  for (const key of [...previews.keys()]) stopPreview(key);
}
