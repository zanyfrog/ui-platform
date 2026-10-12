import { createServer } from 'vite';
import { startAutomationReference } from './trigger-workflow-reference-host.js';
import { closeFormReference } from './form-reference-host.js';
const port = 5191, host = await startAutomationReference(port, entry => console.log('Automation:', JSON.stringify(entry)));
const vite = await createServer({ configFile: 'references/trigger-workflow/vite.config.ts', server: { port, strictPort: true, proxy: { '/api': { target: host.origin } } } });
await vite.listen();
console.log(`Trigger/Workflow reference: http://127.0.0.1:${port}`);
console.log(`Platform management: http://127.0.0.1:${port}/manage.html (security@example.local)`);
console.log(`Isolated persisted records: ${host.ormData}`);
async function close() { await vite.close(); await closeFormReference(); process.exit(0); }
process.on('SIGINT', close); process.on('SIGTERM', close);
