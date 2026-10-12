import { createServer } from 'vite';
import { startFormReference, closeFormReference } from './form-reference-host.js';
const port = 5190;
const host = await startFormReference(port);
const vite = await createServer({ configFile: 'references/form-data/vite.config.ts', server: { port, strictPort: true, proxy: { '/api': { target: host.origin } } } });
await vite.listen();
console.log(`Form/Dataset reference: http://127.0.0.1:${port}/people/register`);
console.log(`Isolated development storage: ${host.ormData}`);
console.log('Use the development sign-in button. Saved record IDs open at /people/<id>/edit.');
async function close() { await vite.close(); await closeFormReference(); process.exit(0); }
process.on('SIGINT', close); process.on('SIGTERM', close);
