import { fileURLToPath, URL } from 'node:url'

import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import vueDevTools from 'vite-plugin-vue-devtools'

import crypto from 'crypto'
import { visualizer } from 'rollup-plugin-visualizer'
import vuetify from 'vite-plugin-vuetify'

const buildHash = crypto.randomBytes(8).toString('hex')

export default defineConfig({
  define: {
    __BUILD_HASH__: JSON.stringify(buildHash),
  },
  plugins: [
    vue(),
    vueDevTools(),
    vuetify({
      autoImport: true,
      styles: {
        configFile: 'src/assets/styles/settings.scss',
      },
    }),
    visualizer({
      template: 'treemap',
      open: true,
      gzipSize: true,
      brotliSize: true,
      filename: './tmp/stats.html',
    }),
    VitePWA({
      // HTMLで利用するサイトのアイコン等をキャッシュ
      includeAssets: [
        'icon-16x16.ico',
        'icon-32x32.ico',
        'favicon.ico',
        'favicon.png',
        'image-512x512.png',
        'apple-touch-icon.png',
      ],
      // manifest.json
      manifest: {
        name: 'MetalMental Music',
        short_name: 'MM Music',
        description: 'A music platform curated by MetalMental.',
        theme_color: '#2196F3',
        background_color: '#121212',
        // https://w3c.github.io/manifest-app-info/#categories-member
        categories: ['music'],
        display: 'standalone',
        dir: 'ltr',
        lang: 'ja-JP',
        launch_handler: {
          client_mode: 'auto',
        },
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            sizes: '16x16',
            src: '/icon-16x16.ico',
            type: 'image/x-icon',
          },
          {
            sizes: '32x32',
            src: '/icon-32x32.ico',
            type: 'image/x-icon',
          },
          {
            sizes: '48x48',
            src: '/favicon.ico',
            type: 'image/x-icon',
          },
          {
            sizes: '192x192',
            src: '/favicon.png',
            type: 'image/png',
          },
          {
            sizes: '512x512',
            src: '/image-512x512.png',
            type: 'image/png',
          },
          {
            sizes: '180x180',
            src: '/apple-touch-icon.png',
            type: 'image/png',
          },
          {
            purpose: 'maskable',
            sizes: '192x192',
            src: '/favicon.png',
            type: 'image/png',
          },
        ],
        screenshots: [
          {
            form_factor: 'wide',
            label: 'MetalMental Music',
            sizes: '1280x720',
            src: '/screenshots.webp',
            type: 'image/webp',
          },
          {
            form_factor: 'narrow',
            label: 'MetalMental Music',
            sizes: '1280x720',
            src: '/screenshots.webp',
            type: 'image/webp',
          },
        ],
        shortcuts: [
          {
            description: 'Open MetalMental Music',
            icons: [
              {
                sizes: '192x192',
                src: '/favicon.png',
              },
            ],
            name: 'MetalMental Music',
            short_name: 'MM Music',
            url: '/',
          },
        ],
      },
      // service workerファイル指定
      srcDir: 'src/sw/',
      filename: 'serviceWorker.ts',
      // プリキャッシュ
      strategies: 'injectManifest',
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,jpg,jpeg,svg,woff2,json,yaml,txt,webp,avif,ts}'],
        globIgnores: ['**/*.gif'],
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024,
      },
      // Service Worker登録/更新方法
      registerType: 'prompt',
      injectRegister: 'script-defer',
      workbox: {
        // 即初期化しない
        clientsClaim: true,
        skipWaiting: false,
        // ソースマップを有効
        sourcemap: true,
      },
      // 開発環境でService Workerを有効化
      devOptions: {
        enabled: true,
        type: 'module',
      },
    }),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg'],
  },
  server: {
    // S3のCORS設定と合わせる
    port: 5173,
  },
})
