<template>
  <div style="overflow-y: auto">
    <v-list
      v-if="musicPlayerStore.tracks.length > 0"
      role="listbox"
      mandatory
      select-strategy="single-independent"
      v-model:selected="selectedIds"
      class="pa-0"
      :disabled="musicStore.loading"
      aria-label="再生リスト"
    >
      <v-list-item
        v-for="music in musicPlayerStore.tracks"
        :key="music.musicId"
        :value="music.musicId"
        class="pl-4 py-2"
        color="primary"
        tabindex="0"
        :aria-label="`${formatTitle(music)}`"
      >
        <template #prepend>
          <v-img
            :src="`${getOwnUrl()}/${music.artworkThumbnailImagePath}`"
            style="view-transition-name: artwork"
            class="me-4"
            width="56"
            height="56"
            aspect-ratio="1"
            cover
            rounded="sm"
            alt=""
            role="img"
            aria-hidden="true"
          >
            <template #placeholder>
              <v-skeleton-loader type="image" width="56" height="56" class="me-4" />
            </template>
          </v-img>
        </template>
        <v-list-item-title>
          {{ formatTitle(music) }}
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </div>
</template>

<script setup lang="ts">
import { useMusicPlayerStore } from '@/presentation/stores/useMusicPlayerStore'
import { useMusicStore } from '@/presentation/stores/useMusicStore'
import { getOwnUrl } from '@/presentation/utils/domain'
import { loadHls } from '@/presentation/utils/hls'
import type { MusicMetadataDto } from '@/use_cases/musicMetadataDto'
import { computed, onMounted } from 'vue'

const musicStore = useMusicStore()
const musicPlayerStore = useMusicPlayerStore()

onMounted(() => {
  // アイドル時に処理することで、初期表示の高速化を図る
  requestIdleCallback(() => loadHls(), { timeout: 3000 })
})

const selectedIds = computed<string[]>({
  get() {
    const id = musicPlayerStore.playerState.musicId
    return id ? [id] : []
  },
  set(ids) {
    const id = ids[0]
    const track = musicPlayerStore.tracks.find((t) => t.musicId === id)
    musicPlayerStore.selectTrack(track)
  },
})

const formatTitle = (music: MusicMetadataDto): string => {
  return (
    music.musicTitle +
    ' ' +
    Math.floor(music.musicSeconds / 60) +
    '分 ' +
    (music.musicSize / 1024 / 1024).toFixed(1) +
    'MB'
  )
}
</script>

<style scoped>
.v-list-item {
  border-top: 1px inset rgba(255, 255, 255, 0.15);
}

.v-list-item:first-child {
  border-top: none;
}
</style>
