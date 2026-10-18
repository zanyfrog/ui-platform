// Local process control only: never imported by the Application or platform.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { createConnection } from 'node:net';

const platform = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const root = path.resolve(process.env.UI_BUILDER_DEMO_ROOT ?? path.join(platform, '..', 'builder-demo'));
const controlFile = path.join(root, 'runtime', 'demo-control.json');
const operation = process.argv[2];

try {
  if (!['status', 'stop'].includes(operation)) throw new Error('Use status or stop.');
  let record;
  try { record = JSON.parse(await readFile(controlFile, 'utf8')); }
  catch (error) {
    if (error.code !== 'ENOENT') throw error;
    if (operation === 'status') process.exitCode = 1;
    else console.log('No managed demo is running. No processes were stopped.');
  }
  if (record) {
    const validEndpoint = process.platform === 'win32'
      ? typeof record.endpoint === 'string' && record.endpoint.startsWith('\\\\.\\pipe\\ui-platform-demo-')
      : typeof record.endpoint === 'string' && path.dirname(record.endpoint) === path.join(root, 'runtime');
    if (record.format !== 'ui-platform.demo-control' || !validEndpoint || !/^[a-f0-9]{64}$/.test(record.token)) throw new Error('Unrecognized demo control file. No processes were stopped.');
    const response = await new Promise((resolve, reject) => {
      const socket = createConnection(record.endpoint);
      socket.setEncoding('utf8'); socket.setTimeout(5000);
      let text = '';
      socket.on('connect', () => socket.write(JSON.stringify({ operation, token: record.token }) + '\n'));
      socket.on('data', chunk => { text += chunk; if (text.length > 8192) socket.destroy(new Error('Invalid control response')); });
      socket.on('timeout', () => socket.destroy(new Error('Demo control did not respond. No unrelated processes were stopped.')));
      socket.on('error', reject);
      socket.on('end', () => { try { resolve(JSON.parse(text)); } catch (error) { reject(error); } });
    });
    if (!response.ok) throw new Error(response.error ?? 'Demo control refused the request.');
    if (operation === 'status') {
      console.log(`Builder: ${response.builder}`);
      if (response.preview) console.log(`Public: ${response.preview}/\nAdmin: ${response.preview}/admin`);
      else console.log('Application preview has not been started.');
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
    if (operation === 'status') process.exitCode = 1;
  } else { console.error(error.message); process.exitCode = 1; }
}
