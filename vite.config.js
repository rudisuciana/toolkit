import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/webhook_topup': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/webhook_kaje': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/webhook_flaz': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/webhook_khfy': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
