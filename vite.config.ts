import { defineConfig } from 'vite';

const apiPort = Number(process.env.UI_PLATFORM_API_PORT ?? 4090);

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: Number(process.env.UI_PLATFORM_UI_PORT ?? 5174),
    proxy: {
      '/api': `http://127.0.0.1:${apiPort}`,
    },
  },
});
