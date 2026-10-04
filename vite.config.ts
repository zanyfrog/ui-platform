import { defineConfig } from 'vitest/config';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const apiPort = Number(process.env.UI_PLATFORM_API_PORT ?? 4090);
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
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
    host: process.env.UI_PLATFORM_EDITOR === '1' ? '127.0.0.1' : '0.0.0.0',
    port: Number(process.env.UI_PLATFORM_UI_PORT ?? 5174),
    proxy: {
      // Preserve the browser-facing host for the editor's same-origin checks.
      '/api': { target: `http://127.0.0.1:${apiPort}`, changeOrigin: false },
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', '**/dist-server/**', 'data/**'],
  },
});
