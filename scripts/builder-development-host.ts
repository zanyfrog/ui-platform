import { readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { createBuilderDevelopmentHost, type BuilderDevelopmentHostConfig } from '../src/server/builder-development-host.js';

const file = process.argv[2];
if (!file) throw new Error('A trusted local Builder host configuration file is required.');
const config = JSON.parse(readFileSync(file, 'utf8')) as BuilderDevelopmentHostConfig;
const host = createBuilderDevelopmentHost(config);
const server = createServer(host.handler);
server.listen(config.port, '127.0.0.1', () => console.info(JSON.stringify({ status: 'listening', applicationId: config.pin.appId, datasetId: config.pin.datasetId, workflows: config.workflows?.ids, address: server.address() })));
const close = () => server.close(() => host.close());
process.on('SIGINT', close); process.on('SIGTERM', close);
