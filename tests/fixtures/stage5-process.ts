// Isolated process-boundary fixture, never a production launcher or identity provider.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { runtimeHandler } from '../../src/server/production/runtime.js';
import { SecureSessions } from '../../src/server/production/sessions.js';
import { PrivateAssets } from '../../src/server/production/private-assets.js';
import { digest } from '../../src/server/production/boundary.js';
import type { OidcLogin } from '../../src/server/production/oidc.js';
if (!process.env.UI_PLATFORM_STAGE3_PHYSICAL_ROOT || !process.env.UI_PLATFORM_TEST_ORIGINAL_ROOT) throw new Error('PHYSICAL_ISOLATION_REQUIRED');
const [kind, publicFile, privateFile] = process.argv.slice(2);
let privateReadDenied = false;
if (kind === 'runtime') { try { await readFile(privateFile!); } catch (error) { privateReadDenied = (error as NodeJS.ErrnoException).code === 'ERR_ACCESS_DENIED'; } if (!privateReadDenied) throw new Error('RUNTIME_STORAGE_ISOLATION_FAILED'); }
const bytes = kind === 'runtime' ? await readFile(publicFile!) : Buffer.alloc(0);
const sessions = new SecureSessions('app-a', 'client-a', 'https://site.example', { async resolve() { throw new Error('NO_PROVIDER'); }, async current() { return false; } });
const handler = kind === 'runtime' ? runtimeHandler({ sessions, login: {} as OidcLogin,
  selected: async () => ({ releaseId: 'release-a', publicFiles: new Map([['/', { bytes, sha256: digest(bytes), mediaType: 'text/html' }]]) }),
  transport: { async send() { throw new Error('NO_ADMITTED_SESSION'); } } }) : kind === 'data' ? async (request: any, response: any) => {
    const assets = new PrivateAssets(process.cwd(), async () => undefined);
    await assets.reply(request, response, 'app-a', 'private-a', 'v1', 'download', async () => { throw new Error('UNAUTHENTICATED'); });
  } : (request: any, response: any) => { response.writeHead(request.url === '/management/health' ? 200 : 404).end('management process'); };
const server = createServer(handler); server.listen(0, '127.0.0.1', () => { process.stdout.write(JSON.stringify({ kind, pid: process.pid, port: (server.address() as { port: number }).port, privateReadDenied }) + '\n'); });
