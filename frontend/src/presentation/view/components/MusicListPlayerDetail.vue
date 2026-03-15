<template>
  <div
    class="container-fluid relative-container d-flex align-center justify-center"
    :style="{
      backgroundImage: `url(${getOwnUrl()}/${musicPlayerStore.playerState.artworkThumbnailImagePath})`,
      backgroundColor: 'rgba(0,0,0,0.8)',
      backgroundSize: 'cover',
      backgroundPosition: 'center center',
      backgroundBlendMode: 'darken',
      height: '100dvh',
    }"
  >
    <div class="glass-overlay"></div>
    <v-img
      :src="`${getOwnUrl()}/${musicPlayerStore.playerState.artworkImagePath}`"
      style="view-transition-name: artwork"
      class="clickable"
      contain
      :alt="`${musicPlayerStore.playerState.musicTitle} のアートワーク`"
      aria-label="再生リストに戻る"
      role="button"
      tabindex="0"
      @click="handleImageClick()"
      @keydown.enter="handleImageClick()"
      @keydown.space="handleImageClick()"
    />

    <p v-if="musicPlayerStore.playerState.musicTitle" class="title-overlay primary--text">
      {{ musicPlayerStore.playerState.musicTitle }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { useMusicPlayerStore } from '@/presentation/stores/useMusicPlayerStore'
import { useMusicStore } from '@/presentation/stores/useMusicStore'
import { getOwnUrl } from '@/presentation/utils/domain'
import type { DetailProps } from '@/router'
import { watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<DetailProps>()

const musicStore = useMusicStore()
const musicPlayerStore = useMusicPlayerStore()
const router = useRouter()

// ページリロードや次の曲へ遷移したときにURLのIDとプレイヤーのIDを同期させる
watch(
  () => props.musicId,
  async (newId) => {
    if (!newId) return
    await musicStore.listMusic()
    if (newId !== musicPlayerStore.playerState.musicId) {
      await musicPlayerStore.selectTrackById(newId)
    }
  },
  { immediate: true },
)

watch(
  () => musicPlayerStore.playerState.musicId,
  (id) => {
    if (!id) return
    if (id !== props.musicId) {
      router.replace({ name: 'detail', params: { id } })
    }
  },
)

watch(
  () => musicPlayerStore.tracks,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async (_tracks) => {
    await musicStore.listMusic()
    const id = props.musicId
    if (id && !musicPlayerStore.playerState.musicId) {
      void musicPlayerStore.selectTrackById(id)
    }
  },
  { immediate: true },
)

const handleImageClick = (): void => {
  router.push({ name: 'home' })
}
</script>

<style scoped>
.relative-container {
  position: relative;
}

.glass-overlay {
  position: absolute;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  backdrop-filter: blur(8px);
  background-color: rgba(255, 255, 255, 0.1);
  pointer-events: none;
}

.clickable {
  cursor: pointer;
}

.title-overlay {
  position: absolute;
  bottom: clamp(0.5rem, 0.3rem + 1vw, 1.5rem);
  left: clamp(0.5rem, 0.3rem + 1vw, 1.5rem);
  font-size: clamp(1rem, 0.8rem + 1vw, 2rem);
  text-shadow: 0 0 4px rgba(0, 0, 0, 0.7);
  pointer-events: none;
}
</style>
