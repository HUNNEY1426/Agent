import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/auth': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/user': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/ai': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/file': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/shell': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/pdf': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/history': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
