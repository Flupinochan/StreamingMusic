<template>
  <v-app>
    <v-defaults-provider>
      <v-snackbar
        v-model="snackbar"
        :timeout="-1"
        location="top"
        variant="tonal"
        color="on-surface"
      >
        新しいバージョンに更新しますか?
        <template #actions>
          <v-btn variant="tonal" color="primary" @click="onUpdate" class="me-2">更新</v-btn>
          <v-btn variant="tonal" color="error" @click="onClose">キャンセル</v-btn>
        </template>
      </v-snackbar>
    </v-defaults-provider>

    <!-- vhではなくスマホのURLバーを考慮したdvhを利用する -->
    <keep-alive include="Home,Detail">
      <v-main class="d-flex flex-column" style="height: 100dvh">
        <router-view style="min-height: 0" />
      </v-main>
    </keep-alive>

    <MusicPlayerFooter />
  </v-app>
</template>

<script setup lang="ts">
import { useMusicStore } from '@/presentation/stores/useMusicStore'
import MusicPlayerFooter from '@/presentation/view/components/MusicPlayerFooter.vue'
import { useRegisterSW } from 'virtual:pwa-register/vue'
import { onMounted, onUnmounted, ref } from 'vue'
import { useMusicPlayerStore } from './presentation/stores/useMusicPlayerStore'
import { loadHls } from './presentation/utils/hls'

const snackbar = ref(false)

const { needRefresh, updateServiceWorker } = useRegisterSW({
  onNeedRefresh() {
    const lastVersion = localStorage.getItem('swVersion')
    if (lastVersion !== __BUILD_HASH__) {
      snackbar.value = true
    }
  },
})

async function onUpdate() {
  localStorage.setItem('swVersion', __BUILD_HASH__)

  // Service Worker更新時に全てのキャッシュを削除
  const keys = await caches.keys()
  await Promise.all(keys.map((key) => caches.delete(key)))

  updateServiceWorker(true)
  snackbar.value = false
}

function onClose() {
  needRefresh.value = false
  snackbar.value = false
}

const musicStore = useMusicStore()
const musicPlayerStore = useMusicPlayerStore()

onMounted(() => {
  musicStore.listMusic()
  requestIdleCallback(() => loadHls(), { timeout: 3000 })
})

onUnmounted(() => {
  musicPlayerStore.disposeEngine()
})
</script>

<!-- グローバルCSS定義 -->
<style>
/* 全ての v-row 内 v-col のpaddingを0で初期化 */
.v-row > .v-col {
  padding: 0 !important;
}

/* height固定の影響のためか
スクロールできないのにスクロールバーが表示されるためhiddenで非表示にする */
html {
  overflow: hidden;
}
</style>
