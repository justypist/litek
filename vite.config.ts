import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(), 
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['lite.svg', 'robots.txt', 'sitemap.xml'],
      manifest: {
        name: 'Lite Kit - Lightweight Online Tools',
        short_name: 'Lite Kit',
        description: 'Free online tools including UUID generator, JSON formatter, Base64 encoder/decoder, network testing tools and more',
        theme_color: '#000000',
        background_color: '#000000',
        display: 'standalone',
        icons: [
          {
            src: '/lite.svg',
            type: 'image/svg+xml',
            sizes: 'any'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/ipinfo\.io\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'ipinfo-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 5 // 5 分钟
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React核心库
          if (id.includes('node_modules/react') || 
              id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react-router-dom')) {
            return 'react-vendor';
          }
          // Radix UI组件
          if (id.includes('node_modules/@radix-ui')) {
            return 'ui-vendor';
          }
          // 图标库
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
        },
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
