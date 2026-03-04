/// <reference lib="webworker" />
import { defaultCache } from '@serwist/next/worker'
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist'
import { Serwist } from 'serwist'

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined
  }
}

declare const self: ServiceWorkerGlobalScope

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: defaultCache,
  fallbacks: {
    entries: [
      {
        url: '/~offline',
        matcher({ request }) {
          return request.destination === 'document'
        },
      },
    ],
  },
})

// Push-Notification Event-Listener (Stub für Epic 3, Story 3.4)
self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json() as {
    title?: string
    body?: string
    url?: string
  }

  event.waitUntil(
    self.registration.showNotification(data.title ?? 'LDS Tracker', {
      body: data.body ?? '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'symptom-processed',
      data: { url: data.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url =
    (event.notification.data as { url?: string })?.url ?? '/'

  event.waitUntil(self.clients.openWindow(url))
})

serwist.addEventListeners()
