import { createServer } from 'vite';
import http from 'node:http';
const api = http.createServer((req, res) => { res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ status: 'ok' })); });
api.listen(Number(process.env.APP_API_PORT || 4091), '127.0.0.1');
const server = await createServer();
await server.listen();
async function stop() { await server.close(); api.close(); }
process.on('SIGINT', stop); process.on('SIGTERM', stop);

