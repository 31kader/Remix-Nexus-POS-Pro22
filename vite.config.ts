import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { fileURLToPath } from 'url';
import {defineConfig, loadEnv} from 'vite';
import { pwaConfig } from './src/config/pwaConfig';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      react(), 
      tailwindcss(),
      VitePWA(pwaConfig)
    ],
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
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react-dom') || id.includes('react/') || id.includes('scheduler')) return 'vendor-react';
              if (id.includes('lucide-react')) return 'vendor-icons';
              if (id.includes('recharts') || id.includes('d3')) return 'vendor-charts';
              if (id.includes('xlsx') || id.includes('papaparse')) return 'vendor-data-utils';
              if (id.includes('@supabase') || id.includes('postgrest')) return 'vendor-supabase';
              if (id.includes('tesseract.js') || id.includes('tesseract.js-core')) return 'vendor-ocr';
              if (id.includes('jspdf') || id.includes('html2canvas') || id.includes('html-to-image')) return 'vendor-pdf-export';
              if (id.includes('@zxing') || id.includes('html5-qrcode')) return 'vendor-scanner';
              if (id.includes('@google/genai') || id.includes('@google/generative-ai')) return 'vendor-gemini';
              // Animation library — only needed when components animate, not at startup
              if (id.includes('framer-motion') || id.includes('motion/react') || (id.includes('/motion/') && !id.includes('emotion'))) return 'vendor-motion';
              // Socket.io — only connected after user login, not needed on login screen
              if (id.includes('socket.io-client') || id.includes('engine.io-client')) return 'vendor-socket';
              // QR code generation — only needed in specific UI flows
              if (id.includes('qrcode') || id.includes('qr-code')) return 'vendor-qrcode';
              // Only include core startup libraries in vendor-base, allowing others to code-split naturally
              const coreLibs = ['dexie', 'zustand', 'sonner', 'bcryptjs', 'tailwind-merge', 'clsx', '@capacitor/core', '@capacitor/app', '@capacitor/browser'];
              if (coreLibs.some(lib => id.includes(`/node_modules/${lib}/`) || id.includes(`\\node_modules\\${lib}\\`))) {
                return 'vendor-base';
              }
            }
          }
        }
      }
    },
    define: {
      // Keys are now handled exclusively on the server side via /api proxy routes
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify — file watching is disabled to prevent flickering during agent edits.
      hmr: false,
    },
  };
});
