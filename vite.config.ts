import { sentryVitePlugin } from "@sentry/vite-plugin";
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
    },
    plugins: [
      react(), 
      tailwindcss(), 
      visualizer({ open: false, filename: 'bundle-analysis.html' }),
      sentryVitePlugin({
        org: "vendorflow",
        project: "javascript-react"
      })
    ],
    build: {
      sourcemap: true,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // Ensure we catch gsap even with different paths
              if (id.includes('gsap')) {
                return 'vendor-gsap';
              }
              if (id.includes('recharts')) {
                return 'vendor-recharts';
              }
              if (id.includes('three') || id.includes('ogl') || id.includes('@react-three')) {
                return 'vendor-viz';
              }
              if (id.includes('react') && (id.includes('react-dom') || id.includes('react-router-dom'))) {
                return 'vendor-react-core';
              }
              if (id.includes('framer-motion')) {
                return 'vendor-framer';
              }
              if (id.includes('lucide-react') || id.includes('react-hot-toast')) {
                return 'vendor-ui';
              }
              if (id.includes('@supabase') || id.includes('posthog-js') || id.includes('@sentry')) {
                return 'vendor-lib';
              }
              return 'vendor-misc';
            }
          }
        }
      }
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
