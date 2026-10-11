import { defineConfig } from 'vite';
export default defineConfig({ base: process.env.UI_APP_BASE || '/', server: { host: '127.0.0.1', port: Number(process.env.UI_PREVIEW_PORT || 5173), strictPort: true } });

