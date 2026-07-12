import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

const isDev = process.env.NODE_ENV !== 'production';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: 'localhost',
    port: 5173,
    strictPort: true,
    middlewareMode: false,
  },
  define: {
    '__DEV_MODE__': isDev,
  },
  optimizeDeps: {
    include: ['@supabase/supabase-js', 'react-router-dom'],
    exclude: ['lucide-react'],
  },
  build: {
    target: 'es2022',
    sourcemap: false,
    minify: 'esbuild',
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]',
        manualChunks(id) {
          if (!id.includes('node_modules')) return;

          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }

          if (id.includes('node_modules/recharts')) {
            return 'vendor-charts';
          }

          if (id.includes('node_modules/jspdf') || id.includes('node_modules/autotable')) {
            return 'vendor-pdf';
          }

          if (id.includes('node_modules/leaflet') || id.includes('node_modules/react-leaflet')) {
            return 'vendor-maps';
          }

          if (id.includes('node_modules/zod') || id.includes('node_modules/@hookform') || id.includes('node_modules/react-hook-form')) {
            return 'vendor-forms';
          }

          if (id.includes('node_modules/zustand')) {
            return 'vendor-state';
          }

          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }

          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }

          return 'vendor';
        },
      },
    },
  },
});
