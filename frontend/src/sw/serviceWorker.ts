// workbox-recipes を参考
// https://developer.chrome.com/docs/workbox/modules/workbox-recipes?hl=ja

import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { cacheNames, clientsClaim, setCacheNameDetails } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { RangeRequestsPlugin } from 'workbox-range-requests'
import { registerRoute } from 'workbox-routing'
import { CacheFirst, NetworkFirst } from 'workbox-strategies'

declare let self: ServiceWorkerGlobalScope
const BUILD_HASH = import.meta.env.VITE_BUILD_HASH

const POST_CACHE_NAME = `music-metalmental-post-${BUILD_HASH}`

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
// 即座にService Workerを有効化しない
// self.skipWaiting()
// バージョンアップ時に古いprecacheを削除
cleanupOutdatedCaches()
// vite.config.tsに記載されている静的ファイル(injectManifest)をprecache
precacheAndRoute(self.__WB_MANIFEST)
/////////////////////////////

/// runtime cache設定
// /api/musicMetadata の GET は Network First (最新データ優先)
registerRoute(
  ({ url, request }) => request.method === 'GET' && url.pathname === '/api/musicMetadata',
  new NetworkFirst({
    cacheName: cacheNames.runtime,
    plugins: [
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
    ],
  }),
  'GET',
)

// GETは全てキャッシュ
registerRoute(
  () => true,
  // Cache優先
  new CacheFirst({
    cacheName: cacheNames.runtime,
    plugins: [
      // キャッシュ対象のHttpStatusCode
      new CacheableResponsePlugin({
        statuses: [0, 200],
      }),
      // Hls rangeヘッダー最適化用
      new RangeRequestsPlugin(),
    ],
  }),
  'GET',
)

// POSTも全てキャッシュ
self.addEventListener('fetch', (event) => {
  const req = event.request

  if (req.method === 'POST') {
    event.respondWith(
      (async () => {
        const cache = await caches.open(POST_CACHE_NAME)
        const body = await req.clone().text()
        const key = req.url + '|' + body

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
      })(),
    )
  }
})
