// Local process control only: never imported by the Application or platform.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'node:net';
import { checkDemoHealth, checkReferenceHealth } from './demo-health.mjs';

const platform = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.env.UI_BUILDER_DEMO_ROOT ?? path.join(platform, '..', 'builder-demo'));
const controlFile = path.join(root, 'runtime', 'demo-control.json');
const operation = process.argv[2];

try {
  if (!['status', 'stop', 'start-all'].includes(operation)) throw new Error('Use status, start-all or stop.');
  let record;
  try { record = JSON.parse(await readFile(controlFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (operation !== 'stop') process.exitCode = 1;
    else console.log('No managed demo is running. No processes were stopped.');
  }
  if (record) {
    const validEndpoint = process.platform === 'win32'
      ? typeof record.endpoint === 'string' && record.endpoint.startsWith('\\\\.\\pipe\\ui-platform-demo-')
      : typeof record.endpoint === 'string' && path.dirname(record.endpoint) === path.join(root, 'runtime');
    if (record.format !== 'ui-platform.demo-control' || !validEndpoint || !/^[a-f0-9]{64}$/.test(record.token)) throw new Error('Unrecognized demo control file. No processes were stopped.');
    const response = await new Promise((resolve, reject) => {
      const socket = createConnection(record.endpoint);
      socket.setEncoding('utf8'); socket.setTimeout(operation === 'start-all' ? 180_000 : 5000);
      let text = '';
      socket.on('connect', () => socket.write(JSON.stringify({ operation, token: record.token }) + '\n'));
      socket.on('data', chunk => { text += chunk; if (text.length > 8192) socket.destroy(new Error('Invalid control response')); });
      socket.on('timeout', () => socket.destroy(new Error('Demo control did not respond. No unrelated processes were stopped.')));
      socket.on('error', reject);
      socket.on('end', () => { try { resolve(JSON.parse(text)); } catch (error) { reject(error); } });
    });
    if (!response.ok) throw new Error(response.error ?? 'Demo control refused the request.');
    if (operation !== 'stop') {
      console.log(`Builder: ${response.builder}`);
      const apiHealth = new URL('/api/health', response.builder); apiHealth.port = '5280';
      console.log(`API health: ${apiHealth.href}`);
      if (response.preview) console.log(`Public: ${response.preview}/demo/\nAdmin: ${response.preview}/demo/admin`);
      else console.log('Application preview has not been started.');
      if (response.reference) console.log('Reference Public: http://127.0.0.1:5193/\nReference Admin: http://127.0.0.1:5193/admin\nReference Manager: http://127.0.0.1:5192\nReference API health: http://127.0.0.1:4092/api/health');
      const issues = await checkDemoHealth(response.builder, response.preview);
      if (response.referenceExpected && !response.reference) issues.push('Reference demo services are not ready.');
      if (response.reference) issues.push(...await checkReferenceHealth());
      if (response.ready === false) issues.unshift('Launcher is still starting.');
      if (issues.length) {
        console.error('Launcher is active, but services are not ready:\n' + issues.join('\n'));
        process.exitCode = 2;
      } else console.log('Service pages and Builder dependencies respond successfully.');
    } else {
      // The launcher removes its control record only after its service tree stops.
      const deadline = Date.now() + 20_000;
      while (true) {
        try {
          const current = JSON.parse(await readFile(controlFile, 'utf8'));
          if (current.token !== record.token) throw new Error('A different demo has started; its services were not stopped.');
        } catch (error) { if (error.code === 'ENOENT') break; throw error; }
        if (Date.now() > deadline) throw new Error('Stop was requested but completion was not confirmed.');
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      console.log('Demo services stopped. Your saved site and data were preserved.');
    }
  }
} catch (error) {
  if (['ENOENT', 'ECONNREFUSED'].includes(error.code)) {
    console.log('The recorded demo is no longer running. No processes were stopped.');
    if (operation !== 'stop') process.exitCode = 1;
  } else { console.error(error.message); process.exitCode = 1; }
}
