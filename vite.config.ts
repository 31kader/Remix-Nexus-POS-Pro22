import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig, loadEnv } from 'vite';
import { pwaConfig } from './src/config/pwaConfig';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
              if (id.includes('tesseract.js') || id.includes('tesseract.js-core')) return 'vendor-ocr';
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) return 'vendor-pdf-export';
              if (id.includes('@zxing') || id.includes('html5-qrcode')) return 'vendor-scanner-lazy';
              if (id.includes('@google/genai') || id.includes('@google/generative-ai')) return 'vendor-gemini';
              if (id.includes('motion/react') || (id.includes('/motion/') && !id.includes('emotion'))) return 'vendor-motion';
              if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'vendor-socket';
              if (id.includes('qrcode') || id.includes('qr-code')) return 'vendor-qrcode';
              
              const coreLibs = ['dexie', 'zustand', 'sonner', 'bcryptjs', 'tailwind-merge', 'clsx', '@capacitor/core', '@capacitor/app', '@capacitor/browser'];
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
      },
    },
  };
});