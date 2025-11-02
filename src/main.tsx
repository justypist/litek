import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { Toaster } from '@/components/ui/sonner'
import { toast } from 'sonner'

import './index.css'
import { AppRouter } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
    <Toaster />
  </StrictMode>
)

// 延迟注册 Service Worker，避免阻塞初始渲染
// 使用 requestIdleCallback 在浏览器空闲时注册，或降级到 load 事件后延迟注册
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  const registerSW = () => {
    import('workbox-window').then(({ Workbox }) => {
      const wb = new Workbox('/sw.js')
      
      // 检测到新版本时，在后台下载完成后显示通知
      wb.addEventListener('waiting', () => {
        // 显示更新通知，右上角弹窗
        toast.info('found new version', {
          description: 'new content available, click update to get the latest version',
          duration: Infinity, // 持续显示，直到用户操作
          action: {
            label: 'update now',
            onClick: () => {
              // 用户点击更新按钮
              wb.messageSkipWaiting()
            }
          },
          cancel: {
            label: 'later',
            onClick: () => {
              // 用户选择稍后更新，关闭通知
              // 新版本会在下次手动刷新时自动激活
            }
          }
        })
      })

      // 当新的 Service Worker 接管页面时，刷新页面
      wb.addEventListener('controlling', () => {
        window.location.reload()
      })

      wb.register()
    }).catch((error) => {
      console.error('Failed to register service worker:', error)
    })
  }

  // 优先使用 requestIdleCallback，浏览器空闲时执行
  if ('requestIdleCallback' in window) {
    requestIdleCallback(registerSW, { timeout: 2000 })
  } else {
    // 降级方案：页面加载完成后再延迟注册
    globalThis.addEventListener('load', () => {
      setTimeout(registerSW, 0)
    })
  }
}
