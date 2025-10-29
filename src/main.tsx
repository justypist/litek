import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import { Toaster } from '@/components/ui/sonner'


import './index.css'
import { AppRouter } from './router'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AppRouter />
    <Toaster />
  </StrictMode>
)

// 注册 Service Worker
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  import('workbox-window').then(({ Workbox }) => {
    const wb = new Workbox('/sw.js')
    
    wb.addEventListener('installed', (event) => {
      if (event.isUpdate) {
        console.log('New service worker installed, reloading page...')
        window.location.reload()
      }
    })

    wb.register()
  }).catch((error) => {
    console.error('Failed to register service worker:', error)
  })
}
