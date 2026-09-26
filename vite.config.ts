import { defineConfig } from 'vitest/config';

const apiPort = Number(process.env.UI_PLATFORM_API_PORT ?? 4090);

export default defineConfig({
  resolve: {
    // Resolve linked UI Base packages through this project's node_modules.
    preserveSymlinks: true,
  },
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
