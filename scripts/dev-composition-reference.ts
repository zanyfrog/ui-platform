import path from 'node:path';
import { tmpdir } from 'node:os';
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdir, stat } from 'node:fs/promises';

// Keep installed Application files outside the repository's live source watchers.
const referenceRoot = path.join(tmpdir(), 'ui-platform-composition-reference-v1');
const apps = path.join(referenceRoot, 'apps');
process.env.UI_APPS_DIR = apps;
process.env.UI_RUNTIME_DIR = path.join(referenceRoot, 'runtime');
const { createApp, appPath } = await import('../src/server/applications.js');
await mkdir(apps, { recursive: true });
const key = 'composition-reference';
if (!await stat(appPath(key)).catch(() => null)) await createApp({ key, name: 'Composition Reference', templateId: 'standard' });
const apiPort = 4092, managerPort = 5192, appPort = 5193;
const api = spawn(process.execPath, ['--import', 'tsx', 'src/server/index.ts'], { stdio: 'inherit', windowsHide: true,
  env: { ...process.env, UI_PLATFORM_API_PORT: String(apiPort), UI_PLATFORM_UI_PORT: String(managerPort), UI_PLATFORM_EDITOR: '0', UI_PLATFORM_V1_DEVELOPMENT_IDENTITY: '0', NODE_ENV: 'development' } });
const manager = await createServer({ configFile: 'vite.config.ts', server: { host: '127.0.0.1', port: managerPort, strictPort: true, proxy: { '/api': { target: `http://127.0.0.1:${apiPort}` } } } });
const application = await createServer({ root: appPath(key), configFile: path.join(appPath(key), 'vite.config.js'), server: { host: '127.0.0.1', port: appPort, strictPort: true } });
await manager.listen(); await application.listen();
console.log(`Application Manager: http://127.0.0.1:${managerPort} (select Composition Reference)`);
console.log(`Public Page: http://127.0.0.1:${appPort}/`);
console.log(`Admin Page: http://127.0.0.1:${appPort}/admin`);
console.log(`Application-owned source: ${appPath(key)}`);
async function close() { await application.close(); await manager.close(); api.kill(); process.exit(0); }
process.on('SIGINT', close); process.on('SIGTERM', close);
