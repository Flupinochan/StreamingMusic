import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { MusicMetadataDto } from '@/use_cases/musicMetadataDto'
import { HlsPlayerEngine } from '../service/player/hlsPlayerEngine'
import type { PlayerEngine } from '../service/player/playerEngine'
import { getOwnUrl } from '../utils/domain'
import { formatSecondsToMMSS } from '../utils/time'

export type PlayerStatus = 'stopped' | 'playing' | 'paused'
export type RepeatMode = 'none' | 'one' | 'all'

// ...tracksのような使い方をしているため、dtoの変数名と一致させる必要があるため注意
export interface PlayerState {
  musicId: string | undefined
  musicTitle: string | undefined
  manifestPath: string | undefined
  artworkImagePath: string | undefined
  artworkThumbnailImagePath: string | undefined
  positionSeconds: number
  musicSeconds: number
  status: PlayerStatus
  repeatMode: RepeatMode
  shuffleEnabled: boolean
}

interface DownloadStatus {
  status: 'idle' | 'downloading' | 'completed'
}

/**
 * ネイティブの HTMLAudioElement によるプレイヤー
 */
export const useMusicPlayerStore = defineStore('musicPlayer', () => {
  // 公開データ ----------------------------------------------------------
  // 選択中の曲、状態 (分離すべきかもしれない)
  const playerState = ref<PlayerState>({
    musicId: undefined,
    musicTitle: undefined,
    manifestPath: undefined,
    artworkImagePath: undefined,
    artworkThumbnailImagePath: undefined,
    positionSeconds: 0,
    musicSeconds: 0,
    status: 'stopped',
    repeatMode: 'none',
    shuffleEnabled: false,
  })
  // 曲のリスト
  const tracks = ref<MusicMetadataDto[]>([])

  const patchPlayerState = (patch: Partial<PlayerState>): void => {
    playerState.value = { ...playerState.value, ...patch }
  }

  // 内部データ --------------------------------------------------------------
  // queue配列の中で現在再生している曲のindex (-1の場合は再生する曲がない状態)
  let currentIndex = -1
  let history: number[] = []
  let engine: PlayerEngine | undefined

  // 表示用ロジック --------------------------------------------------------------
  const isPlaying = (): boolean => playerState.value.status === 'playing'
  const canPlaying = (): boolean => playerState.value.musicId !== undefined
  const canNext = (): boolean =>
    playerState.value.musicId !== undefined && calcNextIndex() !== undefined
  const canPrevious = (): boolean =>
    playerState.value.musicId !== undefined && calcPreviousIndex() !== undefined
  const currentPositionLabel = (): string => formatSecondsToMMSS(playerState.value.positionSeconds)
  const remainDurationLabel = (): string =>
    `- ${formatSecondsToMMSS(
      Math.max(0, playerState.value.musicSeconds - playerState.value.positionSeconds),
    )}`

  // 再生位置(seek)用ロジック -------------------------------------------------------
  // 主にUIからの操作用
  const setSeek = (seconds: number): void => {
    engine?.setSeek(Math.max(0, seconds))
    patchPlayerState({ positionSeconds: Math.max(0, seconds) })
  }

  // timeupdateイベント用 (UIへの同期用)
  const syncSeekFromAudio = (currentSeconds: number, durationSeconds: number): void => {
    patchPlayerState({
      positionSeconds: currentSeconds,
      musicSeconds: durationSeconds,
    })
  }

  // トラック管理 ----------------------------------------------------------
  const loadTrack = async (track: MusicMetadataDto): Promise<void> => {
    disposeEngine()
    await initEngine(track.manifestPath)

    patchPlayerState({
      musicId: track.musicId,
      musicTitle: track.musicTitle,
      artworkImagePath: track.artworkImagePath,
      artworkThumbnailImagePath: track.artworkThumbnailImagePath,
      manifestPath: track.manifestPath,
      positionSeconds: 0,
    })

    if (isPlaying()) {
      await play()
    }
  }

  const initEngine = async (manifestPath: string): Promise<void> => {
    const manifestUrl = new URL(manifestPath, getOwnUrl())

    // Engineを初期化
    engine = new HlsPlayerEngine()
    await engine.load(manifestUrl.toString())

    // Eventを登録
    engine.onTimeUpdate((current, duration) => syncSeekFromAudio(current, duration))
    engine.onEnded(async () => {
      if (playerState.value.repeatMode === 'one') {
        await play()
        return
      }
      await next()
    })
    engine.onError((event) => {
      console.error('Player engine error:', event)
      disposeEngine()
    })
  }

  const disposeEngine = (): void => {
    // Engineを破棄
    engine?.destroy()
    engine = undefined

    // State更新
    patchPlayerState({ manifestPath: undefined })
  }

  const setTracks = (newTracks: MusicMetadataDto[], startAt = 0): void => {
    if (
      tracks.value.length > 0 &&
      tracks.value.length === newTracks.length &&
      tracks.value.every((t, i) => t.musicId === newTracks[i].musicId)
    ) {
      return
    }

    tracks.value = newTracks
    currentIndex = Math.max(0, Math.min(startAt, tracks.value.length - 1))
    history = []
  }

  const getTrackById = (id: string): MusicMetadataDto | undefined =>
    tracks.value.find((t) => t.musicId === id)

  const selectTrackById = async (id: string): Promise<void> => {
    const track = tracks.value.find((t) => t.musicId === id)
    await selectTrack(track)
  }

  const selectTrack = async (track: MusicMetadataDto | undefined): Promise<void> => {
    if (!track) {
      patchPlayerState({
        musicId: undefined,
        musicTitle: undefined,
        manifestPath: undefined,
        artworkImagePath: undefined,
        artworkThumbnailImagePath: undefined,
        positionSeconds: 0,
        musicSeconds: 0,
        status: 'stopped',
      })
      disposeEngine()
      return
    }

    if (track.musicId === playerState.value.musicId) {
      return
    }

    currentIndex = tracks.value.findIndex((t) => t.musicId === track.musicId)
    await loadTrack(tracks.value[currentIndex])

    history = []
  }

  // 再生操作 --------------------------------------------------------------
  const play = async (): Promise<void> => {
    await engine?.play()
    patchPlayerState({ status: 'playing' })
  }

  const pause = (): void => {
    engine?.pause()
    patchPlayerState({ status: 'paused' })
  }

  const stop = (): void => {
    engine?.stop()
    setSeek(0)
    patchPlayerState({ status: 'stopped' })
  }

  // none -> all -> one -> none
  const toggleRepeatMode = (): void => {
    const currentMode = playerState.value.repeatMode
    const nextMode: RepeatMode =
      currentMode === 'none' ? 'all' : currentMode === 'all' ? 'one' : 'none'
    patchPlayerState({ repeatMode: nextMode })
  }

  const toggleShuffle = (): void => {
    const currentShuffleEnabled = playerState.value.shuffleEnabled
    patchPlayerState({ shuffleEnabled: !currentShuffleEnabled })
    if (!currentShuffleEnabled) {
      history = []
    }
  }

  const nextSeek = (): void => {
    setSeek(playerState.value.positionSeconds + 10)
  }

  const previousSeek = (): void => {
    setSeek(playerState.value.positionSeconds - 10)
  }

  // 次の曲がある場合はその曲を返却、なければundefinedを返却
  const next = async (): Promise<MusicMetadataDto | undefined> => {
    const nextIdx = calcNextIndex()
    if (nextIdx === undefined) {
      patchPlayerState({ status: 'stopped', positionSeconds: 0 })
      return undefined
    }

    currentIndex = nextIdx

    // historyを更新 (重複は避ける)
    if (!history.includes(currentIndex)) {
      history.push(currentIndex)
    }

    // 一周分再生済みなら履歴をクリア
    if (
      playerState.value.shuffleEnabled &&
      tracks.value.length > 1 &&
      history.length >= tracks.value.length - 1
    ) {
      history = []
    }

    // 曲のロード
    if (tracks.value[currentIndex]) {
      await loadTrack(tracks.value[currentIndex])
    }

    // 再生中なら新しい曲を再生
    if (playerState.value.status === 'playing') {
      await play()
    }

    // 選択中の曲を更新
    patchPlayerState({
      ...tracks.value[currentIndex],
      positionSeconds: 0,
    })

    return tracks.value[currentIndex]
  }

  const previous = async (): Promise<MusicMetadataDto | undefined> => {
    const prevIdx = calcPreviousIndex()
    if (prevIdx === undefined) {
      patchPlayerState({ status: 'stopped', positionSeconds: 0 })
      return undefined
    }

    currentIndex = prevIdx

    // historyを更新
    const histIdx = history.lastIndexOf(prevIdx)
    if (histIdx >= 0) {
      history.splice(histIdx, 1)
    }

    // 曲のロード
    if (tracks.value[currentIndex]) {
      await loadTrack(tracks.value[currentIndex])
    }
    // 再生中なら新しい曲を再生
    if (playerState.value.status === 'playing') {
      await play()
    }

    // 選択中の曲を更新
    patchPlayerState({
      ...tracks.value[currentIndex],
      positionSeconds: 0,
    })

    return tracks.value[currentIndex]
  }

  // next/previous 計算ロジック --------------------------------------------
  // 次に再生する曲のindexを計算して返却するロジック
  // 状態変更は行わない。上位関数である next() で状態変更は実施
  // 詳細は README.md を参照
  const calcNextIndex = (): number | undefined => {
    if (currentIndex < 0 || tracks.value.length === 0) return undefined
    const isAtEnd = currentIndex === tracks.value.length - 1
    const hasMultiple = tracks.value.length > 1

    // repeat one は常に現在の曲を返す
    if (playerState.value.repeatMode === 'one') return currentIndex

    // シャッフル有効時
    if (playerState.value.shuffleEnabled) {
      // 曲が1つしかない場合
      if (!hasMultiple) return playerState.value.repeatMode === 'all' ? currentIndex : undefined

      // 複数曲ある場合: history と現在の曲を除いた候補からランダムに選ぶ
      const excluded = new Set<number>(history)
      excluded.add(currentIndex)

      const candidates: number[] = []
      for (let i = 0; i < tracks.value.length; i++) {
        if (!excluded.has(i)) candidates.push(i)
      }

      // 履歴が他の全曲を含んでいる場合 (最後の曲まで再生した場合)
      if (candidates.length === 0) {
        // repeatMode に応じて挙動を決定
        if (playerState.value.repeatMode === 'all') {
          // 履歴をクリアせず計算上は現在の曲以外からランダムに選ぶ
          const fresh: number[] = []
          for (let i = 0; i < tracks.value.length; i++) {
            if (i !== currentIndex) fresh.push(i)
          }
          if (fresh.length === 0) return currentIndex
          return fresh[Math.floor(Math.random() * fresh.length)]
        }

        // repeatMode が none の場合は再生を停止
        return undefined
      }

      return candidates[Math.floor(Math.random() * candidates.length)]
    }

    // シャッフル無効時で最終曲でない場合はシンプルに次のインデックスを返却
    if (!isAtEnd) return currentIndex + 1

    // 最終曲でallの場合は先頭の曲を返却
    return playerState.value.repeatMode === 'all' ? 0 : undefined
  }

  // 前に再生した曲のindexを計算して返却するロジック
  // 状態変更は行わない。上位関数である previous() で状態変更は実施
  // 詳細は README.md を参照
  const calcPreviousIndex = (): number | undefined => {
    if (currentIndex < 0 || tracks.value.length === 0) return undefined
    const isAtStart = currentIndex === 0
    const hasHistory = history.length > 0
    const hasMultiple = tracks.value.length > 1

    // repeat one は常に現在の曲を返す
    if (playerState.value.repeatMode === 'one') return currentIndex

    // シャッフル有効時
    if (playerState.value.shuffleEnabled) {
      // historyがある場合
      if (hasHistory) return history[history.length - 1]
      // historyがなければシャッフル無効時と同様のロジック
      if (!isAtStart) return currentIndex - 1
      return playerState.value.repeatMode === 'all'
        ? hasMultiple
          ? tracks.value.length - 1
          : 0
        : undefined
    }

    // シャッフル無効時: 先頭の曲でない場合はシンプルに前のインデックスを返却
    if (!isAtStart) return currentIndex - 1
    // 先頭の曲でallで複数の曲がある場合は最後の曲を返却
    return playerState.value.repeatMode === 'all'
      ? hasMultiple
        ? tracks.value.length - 1
        : 0
      : undefined
  }

  // 全曲fetchする処理
  const totalDownloadCount = ref(0)
  const completedDownloadCount = ref(0)
  const downloadStatus = ref<DownloadStatus>({ status: 'idle' })
  const downloadAllTracks = async (): Promise<void> => {
    downloadStatus.value = { status: 'downloading' }
    const urls: string[] = []

    totalDownloadCount.value = 0
    completedDownloadCount.value = 0

    for (const track of tracks.value) {
      try {
        const manifestUrl = new URL(track.manifestPath, getOwnUrl()).toString()
        const manifestResponse = await fetch(manifestUrl)
        if (!manifestResponse.ok) continue

        const manifestText = await manifestResponse.text()

        const lines = manifestText
          .split('\n')
          .map((line) => line.trim())
          .filter((line) => line !== '' && !line.startsWith('#'))

        urls.push(...lines.map((line) => new URL(line, manifestUrl).toString()))
      } catch {
        continue
      }
    }

    totalDownloadCount.value = urls.length
    // 100件ずつfetch
    for (let i = 0; i < urls.length; i += 100) {
      const chunk = urls.slice(i, i + 100)
      const results = await Promise.allSettled(chunk.map((url) => fetch(url)))
      completedDownloadCount.value += results.length
    }
    downloadStatus.value = { status: 'completed' }
  }

  return {
    playerState,
    tracks,
    totalDownloadCount,
    completedDownloadCount,
    downloadStatus,
    downloadAllTracks,
    setTracks,
    selectTrack,
    play,
    pause,
    stop,
    seek: setSeek,
    toggleRepeatMode,
    toggleShuffle,
    isPlaying,
    canPlaying,
    canNext,
    canPrevious,
    nextSeek,
    previousSeek,
    next,
    previous,
    currentPositionLabel,
    remainDurationLabel,
    selectTrackById,
    getTrackById,
    disposeEngine,
  }
})
