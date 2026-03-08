<template>
  <v-footer class="flex-column pa-c" app aria-label="ミュージックプレイヤー">
    <!-- 再生位置 -->
    <div class="container-fluid mb-2">
      <v-row align="center" class="ga-2">
        <v-col cols="auto">
          <p class="text-caption" aria-hidden="true">
            {{ musicPlayerStore.currentPositionLabel() }}
          </p>
        </v-col>
        <v-col>
          <v-slider
            aria-label="再生位置シークバー"
            :aria-valuetext="musicPlayerStore.currentPositionLabel()"
            track-color="on-surface"
            v-model="sliderSeconds"
            :min="0"
            :max="Math.floor(musicPlayerStore.playerState.musicSeconds)"
            :step="1"
            :disabled="!musicPlayerStore.canPlaying()"
            hide-details
          />
        </v-col>
        <v-col cols="auto">
          <p class="text-caption" aria-hidden="true">
            {{ musicPlayerStore.remainDurationLabel() }}
          </p>
        </v-col>
      </v-row>
    </div>

    <div class="d-flex align-center container-fluid">
      <v-row align="center" class="no-gutters ga-c" style="width: 100%">
        <!-- artwork on left edge -->
        <v-col cols="auto">
          <v-img
            v-if="musicPlayerStore.playerState.artworkThumbnailImagePath"
            :src="`${musicPlayerStore.playerState.url}${musicPlayerStore.playerState.artworkThumbnailImagePath}`"
            :alt="musicPlayerStore.playerState.musicTitle || ''"
            width="64"
            height="64"
            aspect-ratio="1"
            cover
            rounded="sm"
            class="me-2 clickable"
            aria-label="アートワークを表示"
            role="button"
            tabindex="0"
            style="cursor: pointer"
            @click="handleFooterImageClick()"
            @keydown.enter="handleFooterImageClick()"
            @keydown.space="handleFooterImageClick()"
          >
            <template #placeholder>
              <v-skeleton-loader type="image" width="64" height="64" />
            </template>
          </v-img>
        </v-col>

        <v-col>
          <v-row justify="center" class="play-button-padding">
            <!-- リピート -->
            <v-col cols="auto">
              <v-btn
                :size="btnSize"
                :icon="
                  musicPlayerStore.playerState.repeatMode === 'one'
                    ? '$mdiRepeatOnce'
                    : '$mdiRepeat'
                "
                :aria-label="
                  musicPlayerStore.playerState.repeatMode === 'none'
                    ? '全曲繰り返し'
                    : musicPlayerStore.playerState.repeatMode === 'all'
                      ? '1曲繰り返し'
                      : 'リピートを無効'
                "
                :color="
                  musicPlayerStore.playerState.repeatMode === 'none' ? 'on-surface' : 'primary'
                "
                variant="text"
                @click="musicPlayerStore.toggleRepeatMode()"
              />
            </v-col>

            <!-- 前へ -->
            <v-col cols="auto">
              <v-btn
                :size="btnSize"
                color="on-surface"
                icon="$mdiSkipPrevious"
                aria-label="前の曲へ"
                variant="text"
                :disabled="!musicPlayerStore.canPrevious()"
                @click="musicPlayerStore.previous()"
              ></v-btn>
            </v-col>

            <!-- 再生/一時停止 -->
            <v-col cols="auto">
              <v-btn
                :size="btnSize"
                :icon="musicPlayerStore.isPlaying() ? '$mdiPause' : '$mdiPlay'"
                :aria-label="musicPlayerStore.isPlaying() ? '一時停止' : '再生'"
                :color="musicPlayerStore.isPlaying() ? 'primary' : 'on-surface'"
                :disabled="!musicPlayerStore.isPlaying() && !musicPlayerStore.canPlaying()"
                variant="tonal"
                @click="
                  musicPlayerStore.isPlaying() ? musicPlayerStore.pause() : musicPlayerStore.play()
                "
              />
            </v-col>

            <!-- 次へ -->
            <v-col cols="auto">
              <v-btn
                :size="btnSize"
                color="on-surface"
                icon="$mdiSkipNext"
                aria-label="次の曲へ"
                variant="text"
                :disabled="!musicPlayerStore.canNext()"
                @click="musicPlayerStore.next()"
              ></v-btn>
            </v-col>

            <!-- シャッフル -->
            <v-col cols="auto">
              <v-btn
                :aria-label="
                  musicPlayerStore.playerState.shuffleEnabled
                    ? 'シャッフルを無効'
                    : 'シャッフルを有効'
                "
                :size="btnSize"
                icon="$mdiShuffleVariant"
                :color="musicPlayerStore.playerState.shuffleEnabled ? 'primary' : 'on-surface'"
                variant="text"
                @click="musicPlayerStore.toggleShuffle()"
              >
              </v-btn>
            </v-col>
          </v-row>
        </v-col>
      </v-row>
    </div>
  </v-footer>
</template>

<script setup lang="ts">
import { useResponsiveButton } from '@/presentation/composables/useResponsiveButton'
import { useMusicPlayerStore } from '@/presentation/stores/useMusicPlayerStore'
import type { MusicMetadataDto } from '@/use_cases/musicMetadataDto'
import { computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'

const { btnSize } = useResponsiveButton()
const musicPlayerStore = useMusicPlayerStore()
const router = useRouter()

const sliderSeconds = computed<number>({
  get: () => musicPlayerStore.playerState.positionSeconds,
  set: (v) => {
    musicPlayerStore.seek(v)
  },
})

onMounted(() => {
  if ('mediaSession' in navigator) {
    const actionHandlers: [MediaSessionAction, (...args: unknown[]) => void][] = [
      ['play', (): Promise<void> => musicPlayerStore.play()],
      ['pause', (): void => musicPlayerStore.pause()],
      ['seekforward', (): void => musicPlayerStore.nextSeek()],
      ['seekbackward', (): void => musicPlayerStore.previousSeek()],
      ['previoustrack', (): Promise<MusicMetadataDto | undefined> => musicPlayerStore.previous()],
      ['nexttrack', (): Promise<MusicMetadataDto | undefined> => musicPlayerStore.next()],
      ['stop', (): void => musicPlayerStore.stop()],
      [
        'seekto',
        (...args: unknown[]): void => {
          const details = args[0] as { seekTime?: number } | undefined
          if (details?.seekTime !== undefined) {
            musicPlayerStore.seek(details.seekTime)
          }
        },
      ],
    ]

    for (const [action, handler] of actionHandlers) {
      try {
        navigator.mediaSession.setActionHandler(action, handler as unknown as () => void)
      } catch {}
    }
  }
})

const handleFooterImageClick = (): void => {
  const id = musicPlayerStore.playerState.musicId
  if (id) {
    router.push({ name: 'detail', params: { id } })
  }
}

const updateMediaSessionPosition = (): void => {
  if (!('mediaSession' in navigator)) return
  if ('setPositionState' in navigator.mediaSession) {
    try {
      navigator.mediaSession.setPositionState({
        duration: musicPlayerStore.playerState.musicSeconds,
        position: musicPlayerStore.playerState.positionSeconds,
        playbackRate: 1.0,
      })
    } catch {}
  }
}

watch(
  () => musicPlayerStore.playerState,
  (state) => {
    if (!('mediaSession' in navigator)) return

    navigator.mediaSession.metadata = new MediaMetadata({
      title: state.musicTitle ?? '',
      artwork: state.artworkThumbnailImagePath
        ? [
            {
              src: `${musicPlayerStore.playerState.url}${state.artworkThumbnailImagePath}`,
            },
          ]
        : undefined,
    })

    navigator.mediaSession.playbackState =
      state.status === 'playing' ? 'playing' : state.status === 'paused' ? 'paused' : 'none'

    updateMediaSessionPosition()
  },
  { deep: true, immediate: true },
)
</script>

<style scoped>
.play-button-padding {
  gap: clamp(0.5rem, 0.185rem + 1.34vw, 2rem);
}
</style>
