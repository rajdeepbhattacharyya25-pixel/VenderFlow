// import { sentryVitePlugin } from "@sentry/vite-plugin";
import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { visualizer } from 'rollup-plugin-visualizer';

export default defineConfig(({ mode }) => {
  loadEnv(mode, '.', '');
  return {
    appType: 'spa',
    server: {
      port: 3000,
      host: '0.0.0.0',
      headers: {
        'Cross-Origin-Opener-Policy': 'unsafe-none',
        'Cross-Origin-Embedder-Policy': 'unsafe-none'
      }
    },
    plugins: [
      react(), 
      tailwindcss(), 
      visualizer({ open: false, filename: 'bundle-analysis.html' }),
      // sentryVitePlugin({
      //   org: "vendorflow",
      //   project: "javascript-react"
      // })
    ],
    build: {
      sourcemap: true, 
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000
    },
    define: {
      // Allow process.env for legacy support if needed, but prefer import.meta.env
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    }
  };
});
