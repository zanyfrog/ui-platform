import { defineConfig } from 'vite';
import { applicationComposition, visualArtifacts } from '@ui-platform/visual-artifacts/vite';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const root = fileURLToPath(new URL('.', import.meta.url)).replace(/[\\/]$/, '');
const sharedComponentsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.resolve('@ui-platform/visual-artifacts'))), '../../../components');
export default defineConfig({ plugins: [applicationComposition({ root, sharedComponentsRoot }), visualArtifacts({ applicationRoot: root })], base: process.env.UI_APP_BASE || '/', server: { host: '127.0.0.1', port: Number(process.env.UI_PREVIEW_PORT || 5173), strictPort: true,
  proxy: process.env.UI_PLATFORM_API_PORT ? { '/api': { target: `http://127.0.0.1:${Number(process.env.UI_PLATFORM_API_PORT)}` } } : undefined } });
