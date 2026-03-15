// workbox-recipes を参考
// https://developer.chrome.com/docs/workbox/modules/workbox-recipes?hl=ja

import { UserSettingsRepositoryImpl } from '@/infrastructure/repositories/userSettingsRepositoryImpl'
import { UserSettingsRepositoryIndexedDB } from '@/infrastructure/repositories/userSettingsRepositoryIndexedDB'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { cacheNames, clientsClaim, setCacheNameDetails } from 'workbox-core'
import { RangeRequestsPlugin } from 'workbox-range-requests'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope
const BUILD_HASH = import.meta.env.VITE_BUILD_HASH

const POST_CACHE_NAME = `music-metalmental-post-${BUILD_HASH}`
const userSettingsRepository = new UserSettingsRepositoryImpl(new UserSettingsRepositoryIndexedDB())

// GET: 音楽メタデータはネットワーク優先
const musicMetadataStrategy = new NetworkFirst({
  cacheName: cacheNames.runtime,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
  ],
})

// GET: HTMLやService Worker関連はネットワーク優先
const updateSensitiveStrategy = new NetworkFirst({
  cacheName: cacheNames.runtime,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
  ],
})

// GET: その他のリクエストはキャッシュ優先
const getCacheStrategy = new CacheFirst({
  cacheName: cacheNames.runtime,
  plugins: [
    new CacheableResponsePlugin({
      statuses: [0, 200],
    }),
    new RangeRequestsPlugin(),
  ],
})

// precacheおよびruntime cache名の設定
setCacheNameDetails({
  prefix: 'music-metalmental',
  suffix: BUILD_HASH,
  precache: 'precache',
  runtime: 'runtime',
})

/////////////////////////////
/// Vite PWA 仕様上必須コード
/////////////////////////////
clientsClaim()
// App.vueのupdateServiceWorker()を受け取るためのmessageイベントリスナー
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // Service Workerをactivate
    self.skipWaiting()
  }
})
// バージョンアップ時に古いprecacheを削除
// cleanupOutdatedCaches()
// vite.config.tsに記載されている静的ファイル(injectManifest)をprecache
// precacheAndRoute(self.__WB_MANIFEST)
/////////////////////////////

const getOfflineMode = async (): Promise<boolean> => {
  try {
    const settings = await userSettingsRepository.get()
    return settings.isOfflineMode
  } catch {
    return false
  }
}

const createOfflineCacheMissResponse = (): Response => {
  return new Response('Offline mode is enabled and no cached data was found.', {
    status: 503,
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}

// 1度だけリトライ
const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const retryGetOnce = async (requestHandler: () => Promise<Response>): Promise<Response> => {
  try {
    return await requestHandler()
  } catch {
    await sleep(300)
    return requestHandler()
  }
}

// GETリクエスト処理
const handleGetRequest = async (event: FetchEvent): Promise<Response> => {
  const request = event.request
  const isOfflineMode = await getOfflineMode()
  const { pathname } = new URL(request.url)

  // Offline Modeが有効な場合はキャッシュを返却するだけ
  if (isOfflineMode) {
    const cachedResponse = await caches.match(request)
    return cachedResponse ?? createOfflineCacheMissResponse()
  }

  // 音楽メタデータの場合はネットワーク優先
  if (pathname === '/api/musicMetadata') {
    return retryGetOnce(() => musicMetadataStrategy.handle({ event, request }))
  }

  // HTMLやService Worker関連のリクエストはネットワーク優先
  if (
    request.mode === 'navigate' ||
    pathname === '/' ||
    pathname === '/index.html' ||
    pathname === '/registerSW.js' ||
    pathname === '/serviceWorker.js' ||
    pathname === '/manifest.webmanifest'
  ) {
    return retryGetOnce(() => updateSensitiveStrategy.handle({ event, request }))
  }

  // その他はキャッシュ優先
  return getCacheStrategy.handle({ event, request })
}

// POSTリクエスト処理
const handlePostRequest = async (event: FetchEvent): Promise<Response> => {
  const req = event.request
  const cache = await caches.open(POST_CACHE_NAME)
  const body = await req.clone().text()
  const key = req.url + '|' + body
  const isOfflineMode = await getOfflineMode()

  if (isOfflineMode) {
    const cachedResponse = await cache.match(key)
    return cachedResponse ?? createOfflineCacheMissResponse()
  }

  try {
    // 1. ネットワーク優先
    const response = await fetch(req.clone())
    if (!response || response.status !== 200) {
      throw new Error('Network response was not ok')
    }
    // キャッシュを更新
    await cache.put(new Request(key), response.clone())
    return response
  } catch {
    // 2. ネットワーク失敗時はキャッシュを返却
    const cachedRes = await cache.match(key)
    if (cachedRes) return cachedRes
    // キャッシュもなければエラー
    return new Response('Network error and no cached data', { status: 503 })
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request
  const url = new URL(req.url)

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return
  }

  if (req.method === 'GET') {
    event.respondWith(handleGetRequest(event))
    return
  }

  if (req.method === 'POST') {
    event.respondWith(handlePostRequest(event))
  }
})
