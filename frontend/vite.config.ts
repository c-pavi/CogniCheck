import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // Proxy /api calls to the FastAPI backend during local dev so we don't
    // fight CORS. In production the frontend is deployed to Vercel and the
    // backend to a separate host; use VITE_API_URL in .env.production to
    // override the API base.
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
