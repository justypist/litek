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
            handler: 'CacheFirst', // 改为 CacheFirst，优先使用缓存
            options: {
              cacheName: 'ipinfo-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 // 延长到 1 小时
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
          // React 核心拆分得更细
          if (id.includes('node_modules/react/') && !id.includes('node_modules/react-dom')) {
            return 'react-core';
          }
          if (id.includes('node_modules/react-dom/')) {
            return 'react-dom';
          }
          if (id.includes('node_modules/react-router-dom')) {
            return 'react-router';
          }
          // Radix UI组件
          if (id.includes('node_modules/@radix-ui')) {
            return 'ui-vendor';
          }
          // 图标库
          if (id.includes('node_modules/lucide-react')) {
            return 'icons';
          }
          // 其他工具库
          if (id.includes('node_modules/')) {
            return 'vendor';
          }
        },
      },
    },
    // 启用更激进的压缩
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log'],
        // 移除未使用的代码
        unused: true,
        // 移除死代码
        dead_code: true,
      },
    },
    chunkSizeWarningLimit: 500,
  },
})
