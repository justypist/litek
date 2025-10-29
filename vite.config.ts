import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from "@tailwindcss/vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
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
