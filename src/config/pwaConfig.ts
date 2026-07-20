import { VitePWAOptions } from 'vite-plugin-pwa';

export const pwaConfig: Partial<VitePWAOptions> = {
  registerType: 'autoUpdate',
  selfDestroying: false,
  injectRegister: 'auto',
  includeAssets: ['icon.svg', 'apple-touch-icon.png', 'favicon.ico'],
  manifest: {
    name: 'Nexus POS Pro',
    short_name: 'NexusPOS',
    description: 'Système de point de vente intelligent et gestion de stock omnicanale',
    theme_color: '#4f46e5',
    background_color: '#020617',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    orientation: 'portrait-primary',
    categories: ['business', 'finance', 'productivity'],
    icons: [
      {
        src: 'icon.svg',
        sizes: '192x192 512x512',
        type: 'image/svg+xml',
        purpose: 'any maskable'
      },
      {
        src: 'icon.svg',
        sizes: '192x192',
        type: 'image/svg+xml'
      },
      {
        src: 'icon.svg',
        sizes: '512x512',
        type: 'image/svg+xml'
      }
    ]
  },
  workbox: {
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
    maximumFileSizeToCacheInBytes: 5000000,
    runtimeCaching: [
      {
        urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
        handler: 'CacheFirst',
        options: {
          cacheName: 'google-fonts-cache',
          expiration: {
            maxEntries: 10,
            maxAgeSeconds: 60 * 60 * 24 * 365 // 365 jours
          },
          cacheableResponse: {
            statuses: [0, 200]
          }
        }
      }
    ]
  }
};
