import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { visualArtifacts } from '@ui-platform/visual-artifacts/vite';
const root = path.dirname(fileURLToPath(import.meta.url));
export default defineConfig({ root, plugins: [visualArtifacts({ componentsRoot: path.resolve(root, '../../components'), packageManifests: [path.resolve(root, '../../node_modules/@ui-base/ui/ui.component.json')] })], server: { host: '127.0.0.1', port: 5191 }, build: { outDir: '../../dist/automation-reference', emptyOutDir: false } });
