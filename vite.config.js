import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
        },
      },
    },
  },
  server: {
    port: 5174,
    strictPort: false,
    proxy: {
      '/api': {
        target: 'http://localhost:3101',
        changeOrigin: true,
      },
    },
  },
});
