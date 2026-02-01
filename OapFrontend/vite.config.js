import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import svgr from 'vite-plugin-svgr';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react(), svgr()],
  resolve: {
    alias: {
      '@assets': resolve(__dirname, 'server/src/assets'),
      '@': resolve(__dirname, 'server/src'),
      '@components': resolve(__dirname, 'server/src/components'),
      '@pages': resolve(__dirname, 'server/src/pages'),
      '@home': resolve(__dirname, 'server/src/pages/Home'),
      '@profile': resolve(__dirname, 'server/src/pages/Profile'),
      '@context': resolve(__dirname, 'server/src/context'),
      '@layouts': resolve(__dirname, 'server/src/layouts'),
      '@utils': resolve(__dirname, 'server/src/utils')
    },
  },
  root: 'server/src',
  build: {
    outDir: resolve(__dirname, 'dist'),
    emptyOutDir: true,
    copyPublicDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'server/src/AppEntry.jsx'),
      output: {
        entryFileNames: 'Js/bundle.js',
        assetFileNames: 'Js/assets/[name]-[hash][extname]',
      },
    },
  },
  server: {
    port: 8080,
    open: true,
    host: true,
    proxy: {
      '/api': {
        target: 'http://localhost:5101',  // HTTP port from launchSettings.json
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/api')
      },
    },
  },
});