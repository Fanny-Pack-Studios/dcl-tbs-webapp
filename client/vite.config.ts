import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000, // Client runs on port 3000
    proxy: {
      '/api': {
        target: 'http://localhost:3001', // Proxy API requests to NestJS backend
        changeOrigin: true,
        // Removed the rewrite rule: (path) => path.replace(/^\/api/, '')
        // Now, /api requests from client will be forwarded as /api to backend.
      },
    },
  },
});
