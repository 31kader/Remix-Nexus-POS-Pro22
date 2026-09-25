import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import type { VitePWAOptions } from 'vite-plugin-pwa';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pwaConfig: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  includeAssets: ['favicon.svg', 'icon.svg', 'robots.txt', 'apple-touch-icon.png'],
  manifest: {
    name: 'Nexus POS Pro - Système de Caisse Intelligent',
    short_name: 'NexusPOS',
    description: 'Logiciel de point de vente et de gestion de stock professionnel hors-ligne',
    theme_color: '#4f46e5',
    background_color: '#f8fafc',
    display: 'standalone',
    orientation: 'landscape',
    icons: [
      {
        src: 'icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      }
    ]
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
    cleanupOutdatedCaches: true,
    clientsClaim: true,
    skipWaiting: true
  }
};

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: './',
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA(pwaConfig)
    ],
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/socket.io': {
          target: 'http://localhost:3000',
          ws: true,
        }
      }
    },
    esbuild: {
      drop: ['console', 'debugger'],
    },
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      emptyOutDir: true,
      sourcemap: false,
      minify: 'esbuild',
      rollupOptions: {
        external: ['@capacitor-community/sqlite'],
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
              if (id.includes('xlsx')) return 'vendor-xlsx-lazy';
              if (id.includes('papaparse')) return 'vendor-data-utils';
              if (id.includes('@supabase') || id.includes('postgrest')) return 'vendor-supabase';
              if (id.includes('html-to-image')) return 'vendor-image-export';
              if (id.includes('@zxing')) return 'vendor-scanner-lazy';
              if (id.includes('@google/genai') || id.includes('@google/generative-ai')) return 'vendor-gemini';
              if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'vendor-socket';
              if (id.includes('qrcode') || id.includes('qr-code')) return 'vendor-qrcode';
              
              const coreLibs = ['zustand', 'sonner', 'bcryptjs', 'tailwind-merge', 'clsx', '@capacitor/core', '@capacitor/app', '@capacitor/browser'];
              if (coreLibs.some(lib => id.includes(`/node_modules/${lib}/`) || id.includes(`\\node_modules\\${lib}\\`))) {
                return 'vendor-base';
              }
            }
          }
        }
      }
    },
    define: {},
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'motion/react': path.resolve(__dirname, './src/lib/motion-shim.tsx'),
        'framer-motion': path.resolve(__dirname, './src/lib/motion-shim.tsx'),
      },
    },
  };
});