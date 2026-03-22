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
      sourcemap: false, // Disable sourcemaps in production for smaller builds
      minify: 'terser',
      terserOptions: {
        compress: {
          drop_console: true,
          drop_debugger: true,
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'vendor-react';
              if (id.includes('three')) return 'vendor-three';
              if (id.includes('gsap')) return 'vendor-anim';
              if (id.includes('framer-motion')) return 'vendor-framer';
              if (id.includes('sentry')) return 'vendor-sentry';
              if (id.includes('lucide')) return 'vendor-icons';
              return 'vendor-others';
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
