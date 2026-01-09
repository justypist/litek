import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  mode,
  plugins: [
    react(), 
    tailwindcss(),
    // WASM 插件 - 配置正确的 MIME 类型
    {
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith('.wasm')) {
            res.setHeader('Content-Type', 'application/wasm');
          }
          next();
        });
      },
    },
    // HTML 替换插件 - 仅在生产环境注入 Cloudflare Analytics
    // {
    //   name: 'html-transform',
    //   transformIndexHtml(html) {
    //     const cloudflareScript = mode === 'production' 
    //       ? `<script defer src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{"token": "2aecdc025eb043bc89ce931b54a80054"}'></script>`
    //       : '';
    //     return html.replace('<!--CLOUDFLARE_ANALYTICS_PLACEHOLDER-->', cloudflareScript);
    //   }
    // },
    VitePWA({
      registerType: 'autoUpdate',
      // 禁用自动注入 registerSW.js，改为手动延迟注册
      injectRegister: null,
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
        globPatterns: ['**/*.{js,css,svg,png,ico,woff2,wasm}'],
        // 不预缓存 HTML，使用运行时缓存策略确保能检测到更新
        globIgnores: ['**/index.html'],
        maximumFileSizeToCacheInBytes: 100 * 1024 * 1024,
        // 使用 NetworkFirst 策略处理导航请求（HTML），确保能检测到新版本
        navigationPreload: true,
        runtimeCaching: [
          {
            // HTML 文件使用 NetworkFirst，优先从网络获取以检测更新
            // 匹配根路径和 index.html
            urlPattern: ({ request, url }) => {
              return request.mode === 'navigate' || 
                     url.pathname === '/' || 
                     url.pathname === '/index.html'
            },
            handler: 'NetworkFirst',
            options: {
              cacheName: 'html-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 // 24 小时
              },
              networkTimeoutSeconds: 3 // 3 秒超时，超时后使用缓存
            }
          },
          {
            // 同源静态资源使用 StaleWhileRevalidate，既能快速响应又能检查更新
            urlPattern: ({ sameOrigin, url }) => {
              return sameOrigin && /\.(js|css|svg|png|ico|woff2|wasm)$/i.test(url.pathname)
            },
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 天
              }
            }
          },
          {
            urlPattern: /^https:\/\/ipinfo\.io\/.*/i,
            handler: "NetworkFirst",
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
          },
          {
            // Frankfurter API 汇率缓存
            urlPattern: /^https:\/\/api\.frankfurter\.app\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'currency-rates-cache',
              expiration: {
                maxEntries: 5,
                maxAgeSeconds: 60 * 60 * 12 // 12 小时
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Google Fonts 样式表缓存
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 年
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            // Google Fonts 字体文件缓存
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 年
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ],
        cleanupOutdatedCaches: true,
        clientsClaim: true,   // 新 SW 激活后立即接管
        skipWaiting: false    // 不自动跳过等待，需要手动触发
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
    },
    fs: {
      strict: false,
    },
  },
  optimizeDeps: {
    exclude: ['@jsquash/avif', '@jsquash/jpeg', '@jsquash/png', '@jsquash/webp', '@jsquash/resize'],
  },
  build: {
    target: 'esnext',
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
          // Radix UI 组件按模块拆分，减少未使用的代码
          if (id.includes('node_modules/@radix-ui/react-collapsible')) {
            return 'radix-collapsible';
          }
          if (id.includes('node_modules/@radix-ui/react-dialog')) {
            return 'radix-dialog';
          }
          if (id.includes('node_modules/@radix-ui/react-dropdown-menu')) {
            return 'radix-dropdown';
          }
          if (id.includes('node_modules/@radix-ui/react-popover')) {
            return 'radix-popover';
          }
          if (id.includes('node_modules/@radix-ui/react-select')) {
            return 'radix-select';
          }
          if (id.includes('node_modules/@radix-ui/react-slider')) {
            return 'radix-slider';
          }
          if (id.includes('node_modules/@radix-ui/react-tooltip')) {
            return 'radix-tooltip';
          }
          // 其他 Radix UI 组件
          if (id.includes('node_modules/@radix-ui')) {
            return 'radix-other';
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
    // CSS 代码分割优化
    cssCodeSplit: true,
  },
}))
