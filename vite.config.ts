import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { visualArtifacts } from '@ui-platform/visual-artifacts/vite';

const apiPort = Number(process.env.UI_PLATFORM_API_PORT ?? 4090);
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [visualArtifacts({ componentsRoot: path.join(projectRoot, 'components') })],
  // These workspace outputs change during development. Load their current
  // modules, as the reference host does, rather than retaining an old runtime.
  optimizeDeps: { exclude: ['@ui-platform/visual-artifacts', '@ui-platform/visual-artifacts/runtime', '@ui-platform/visual-artifacts/revision-guard'] },
  build: { rollupOptions: { input: { main: path.join(projectRoot, 'index.html'), 'visual-preview': path.join(projectRoot, 'visual-preview.html') } } },
  resolve: {
    // Resolve linked UI Base packages through this project's node_modules.
    preserveSymlinks: true,
    alias: [
      { find: /^@ui-base\/core$/, replacement: path.join(projectRoot, 'node_modules/@ui-base/core/src/index.js') },
      { find: /^@ui-base\/ui\/action-button$/, replacement: path.join(projectRoot, 'node_modules/@ui-base/ui/src/actions/uib-action-button.js') },
    ],
  },
  ssr: { noExternal: ['@ui-base/forms', '@ui-base/core', '@ui-base/ui'] },
  server: {
    // Builder reads authoring bundles through owner services. Vite HTML reloads would discard retained editors.
    // Running Applications have their own revision-aware watchers; focused preview is explicitly refreshed.
    watch: { ignored: [path.join(projectRoot, 'components', '**').replaceAll('\\', '/')] },
    host: process.env.UI_PLATFORM_EDITOR === '1' || process.env.UI_PLATFORM_V1_DEVELOPMENT_IDENTITY === '1' ? '127.0.0.1' : '0.0.0.0',
    port: Number(process.env.UI_PLATFORM_UI_PORT ?? 5174),
    proxy: {
      // Preserve the browser-facing host for the editor's same-origin checks.
      '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-server/**', '**/.uib/**', 'data/**'],
  },
});
