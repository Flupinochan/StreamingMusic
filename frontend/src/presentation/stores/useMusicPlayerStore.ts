import { defineStore } from 'pinia'
import { ref } from 'vue'

import type { MusicMetadataDto } from '@/use_cases/musicMetadataDto'
import type Hls from 'hls.js'

type HlsEventsType = typeof Hls.Events

type HlsModuleShape = {
  default: typeof Hls
  Events: HlsEventsType
}

type HlsModuleAltShape = {
  Events: HlsEventsType
} & typeof Hls

function isHlsModuleShape(mod: unknown): mod is HlsModuleShape {
  return typeof mod === 'object' && mod !== null && 'default' in mod && 'Events' in mod
}

function isHlsModuleAltShape(mod: unknown): mod is HlsModuleAltShape {
  return typeof mod === 'object' && mod !== null && 'Events' in mod
}

let HlsClass: typeof Hls | undefined
let HlsEvents: HlsEventsType | undefined

const loadHls = async (): Promise<void> => {
  if (HlsClass) return

  const mod: unknown = await import('hls.js/dist/hls.light')

  if (isHlsModuleShape(mod)) {
    HlsClass = mod.default
    HlsEvents = mod.Events
    return
  }

  if (isHlsModuleAltShape(mod)) {
    HlsClass = mod as unknown as typeof Hls
    HlsEvents = mod.Events
    return
  }

  throw new Error('Invalid hls.js module shape')
}

export type PlayerStatus = 'stopped' | 'playing' | 'paused'
export type RepeatMode = 'none' | 'one' | 'all'

// dtoの変数名と一致させる必要があるため注意
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

  // 内部データ --------------------------------------------------------------
  // queue配列の中で現在再生している曲のindex (-1の場合は再生する曲がない状態)
  let index = -1
  let history: number[] = []
  let currentUrl: URL | undefined
  // HTMLMediaElementを継承している
  let audio: HTMLAudioElement | undefined
  let hls: Hls | undefined
  // HLS のマニフェスト解析完了を待つ Promise
  let hlsReady: Promise<void> | undefined
  // マニフェストを blob に書き換えた URL (disposeEngine で revoke)
  let manifestBlobUrl: string | undefined
  let audioEndedListener: (() => void) | undefined
  // seek用タイマーID
  let tickId: number | undefined

  // 表示用ロジック --------------------------------------------------------------
  const isPlaying = (): boolean => playerState.value.status === 'playing'
  const canPlaying = (): boolean => playerState.value.musicId !== undefined
  const canNext = (): boolean =>
    playerState.value.musicId !== undefined && calcNextIndex() !== undefined
  const canPrevious = (): boolean =>
    playerState.value.musicId !== undefined && calcPreviousIndex() !== undefined

  const totalDurationLabel = (): string => {
    const total = playerState.value.musicSeconds
    const min = Math.floor(total / 60)
      .toString()
      .padStart(2, '0')
    const sec = Math.floor(total % 60)
      .toString()
      .padStart(2, '0')
    return `${min}:${sec}`
  }

  const currentPositionLabel = (): string => {
    const current = playerState.value.positionSeconds
    const min = Math.floor(current / 60)
      .toString()
      .padStart(2, '0')
    const sec = Math.floor(current % 60)
      .toString()
      .padStart(2, '0')
    return `${min}:${sec}`
  }

  const remainDurationLabel = (): string => {
    const remain = Math.max(0, playerState.value.musicSeconds - playerState.value.positionSeconds)
    const min = Math.floor(remain / 60)
      .toString()
      .padStart(2, '0')
    const sec = Math.floor(remain % 60)
      .toString()
      .padStart(2, '0')
    return `- ${min}:${sec}`
  }

  // 再生位置(seek)用ロジック -------------------------------------------------------
  const getSeek = (): void => {
    if (!audio) return
    playerState.value = {
      ...playerState.value,
      positionSeconds: audio.currentTime,
      musicSeconds: Number.isNaN(audio.duration) ? 0 : audio.duration,
    }
  }

  const setSeek = (seconds: number): void => {
    if (audio) {
      audio.currentTime = Math.max(0, seconds)
    }
    getSeek()
  }

  // howlerから定期的に再生位置を取得するタイマー
  const startTick = (): void => {
    if (tickId !== undefined) return
    tickId = window.setInterval(getSeek, 1000)
  }

  const clearTick = (): void => {
    if (tickId === undefined) return
    clearInterval(tickId)
    tickId = undefined
  }

  // トラック管理 ----------------------------------------------------------
  const loadTrack = async (track: MusicMetadataDto): Promise<void> => {
    // S3から曲のURLを取得
    // const url = new URL(`${window.location.origin}/${track.manifestPath}`)
    const url = new URL(`https://music2.metalmental.net/${track.manifestPath}`)
    if (audio && currentUrl === url) return
    disposeEngine()
    // 曲をロード
    currentUrl = url
    // HTMLAudioElement(audioタグ)を生成
    audio = new Audio()
    audio.preload = 'auto'
    // HLS ソースを前提として扱う
    const srcStr = url.toString()

    // 理論上 HLS マニフェストであるべきだが、念のためチェックする
    if (!/\.m3u8(?:\?|$)/i.test(srcStr)) {
      console.warn('loading non-HLS URL into player', srcStr)
    }

    await loadHls()

    if (!HlsClass || !HlsEvents) {
      throw new Error('Hls not loaded')
    }

    hls = new HlsClass()

    // マニフェスト解析完了を待つ Promise を作成
    hlsReady = new Promise<void>((resolve) => {
      hls!.once(HlsEvents!.MANIFEST_PARSED, () => resolve())
    })

    hls.loadSource(currentUrl.toString())
    hls.attachMedia(audio)

    // 再生前に manifest 解析完了を待機
    try {
      await hlsReady
    } catch (err) {
      console.error('failed to load HLS manifest', err)
      throw err
    }
    // 曲が終了したときのイベントリスナーを登録
    audioEndedListener = async (): Promise<void> => {
      if (playerState.value.repeatMode === 'one') {
        await play()
        return
      }

      const isNext = await next()
      if (!isNext) {
        // 次の曲がない場合は停止状態にする
        playerState.value = {
          ...playerState.value,
          status: 'stopped',
        }
      }
    }
    audio.addEventListener('ended', audioEndedListener)
  }

  const setTracks = (newTracks: MusicMetadataDto[], startAt = 0): void => {
    // 同じリストが再取得された場合は何もしない
    if (
      tracks.value.length === newTracks.length &&
      tracks.value.every((t, i) => t.musicId === newTracks[i].musicId)
    ) {
      return
    }

    tracks.value = newTracks
    index = tracks.value.length === 0 ? -1 : Math.max(0, Math.min(startAt, tracks.value.length - 1))
    history = []

    // リストが変わったタイミングでエンジンを破棄して状態をリセット
    // 曲が削除された場合に再生できない状態になるのを防ぐため
    // ※現状は、意図しない曲の停止を防ぐためコメントアウト
    // disposeEngine();
    // playerState.value = { ...playerState.value, status: "stopped" };
  }

  const getTrackById = (id: string): MusicMetadataDto | undefined =>
    tracks.value.find((t) => t.musicId === id)

  const selectTrackById = async (id: string): Promise<void> => {
    const track = tracks.value.find((t) => t.musicId === id)
    await selectTrack(track)
  }

  const selectTrack = async (track: MusicMetadataDto | undefined): Promise<void> => {
    if (!track) {
      playerState.value = {
        ...playerState.value,
        musicId: undefined,
        musicTitle: undefined,
        manifestPath: undefined,
        artworkImagePath: undefined,
        artworkThumbnailImagePath: undefined,
        positionSeconds: 0,
        musicSeconds: 0,
        status: 'stopped',
      }
      disposeEngine()
      return
    }

    if (track.musicId === playerState.value.musicId) return

    const idx = tracks.value.findIndex((t) => t.musicId === track.musicId)
    index = idx
    if (tracks.value[index]) await loadTrack(tracks.value[index])
    if (isPlaying()) {
      await play()
    }

    history = []

    playerState.value = {
      ...playerState.value,
      ...track,
      positionSeconds: 0,
    }
  }

  const disposeEngine = (): void => {
    if (!audio) return
    if (audioEndedListener) {
      audio.removeEventListener('ended', audioEndedListener)
      audioEndedListener = undefined
    }

    clearTick()

    audio.pause()
    audio.removeAttribute('src')
    audio.src = ''
    audio.load()
    audio = undefined

    if (hls) {
      hls.destroy()
      hls = undefined
    }

    currentUrl = undefined
    hlsReady = undefined
    if (manifestBlobUrl) {
      URL.revokeObjectURL(manifestBlobUrl)
      manifestBlobUrl = undefined
    }
  }

  // 再生操作 --------------------------------------------------------------
  const play = async (): Promise<void> => {
    if (index < 0) return
    playerState.value = { ...playerState.value, status: 'playing' }

    try {
      await audio?.play()
    } catch (err) {
      // HLS 用の再生待機と再試行
      if (hls && hlsReady) {
        try {
          await hlsReady
        } catch {
          // manifest 読み込みに失敗している場合は当該エラーを上書きせず終了
        }
        await audio?.play().catch((e) => {
          console.error('play retry failed', e)
        })
      } else {
        console.error('audio.play() failed', err)
      }
    }

    startTick()
  }

  const pause = (): void => {
    playerState.value = { ...playerState.value, status: 'paused' }
    audio?.pause()
    clearTick()
  }

  const stop = (): void => {
    playerState.value = { ...playerState.value, status: 'stopped' }
    if (audio) {
      audio.pause()
      audio.currentTime = 0
    }
    clearTick()
    setSeek(0)
  }

  // none -> all -> one -> none
  const toggleRepeatMode = (): void => {
    const currentMode = playerState.value.repeatMode
    const nextMode: RepeatMode =
      currentMode === 'none' ? 'all' : currentMode === 'all' ? 'one' : 'none'
    playerState.value = { ...playerState.value, repeatMode: nextMode }
  }

  const toggleShuffle = (): void => {
    const currentShuffleEnabled = playerState.value.shuffleEnabled
    playerState.value = {
      ...playerState.value,
      shuffleEnabled: !currentShuffleEnabled,
    }
    if (!currentShuffleEnabled) history = []
  }

  const nextSeek = (): void => {
    if (!audio) return
    const current = audio.currentTime
    setSeek(current + 10)
  }

  const previousSeek = (): void => {
    if (!audio) return
    const current = audio.currentTime
    setSeek(current - 10)
  }

  const next = async (): Promise<MusicMetadataDto | undefined> => {
    const nextIdx = calcNextIndex()
    if (nextIdx === undefined) return undefined
    index = nextIdx

    // historyを更新 (重複は避ける)
    if (!history.includes(index)) history.push(index)

    // 一周分再生済みなら履歴をクリア
    if (
      playerState.value.shuffleEnabled &&
      tracks.value.length > 1 &&
      history.length >= tracks.value.length - 1
    ) {
      history = []
    }

    // 曲のロード
    if (tracks.value[index]) await loadTrack(tracks.value[index])

    // 再生中なら新しい曲を再生
    if (playerState.value.status === 'playing') {
      await play()
    }

    // 選択中の曲を更新
    playerState.value = {
      ...playerState.value,
      ...tracks.value[index],
      positionSeconds: 0,
    }

    return tracks.value[index]
  }

  const previous = async (): Promise<MusicMetadataDto | undefined> => {
    const prevIdx = calcPreviousIndex()
    if (prevIdx === undefined) return undefined
    index = prevIdx

    // historyを更新
    const histIdx = history.lastIndexOf(prevIdx)
    if (histIdx >= 0) history.splice(histIdx, 1)
    // 曲のロード
    if (tracks.value[index]) await loadTrack(tracks.value[index])
    // 再生中なら新しい曲を再生
    if (playerState.value.status === 'playing') {
      await play()
    }

    // 選択中の曲を更新
    playerState.value = {
      ...playerState.value,
      ...tracks.value[index],
      positionSeconds: 0,
    }

    return tracks.value[index]
  }

  // next/previous 計算ロジック --------------------------------------------
  // 次に再生する曲のindexを計算して返却するロジック
  // 状態変更は行わない。上位関数である next() で状態変更は実施
  // 詳細は README.md を参照
  const calcNextIndex = (): number | undefined => {
    if (index < 0 || tracks.value.length === 0) return undefined
    const isAtEnd = index === tracks.value.length - 1
    const hasMultiple = tracks.value.length > 1

    // repeat one は常に現在の曲を返す
    if (playerState.value.repeatMode === 'one') return index

    // シャッフル有効時
    if (playerState.value.shuffleEnabled) {
      // 曲が1つしかない場合
      if (!hasMultiple) return playerState.value.repeatMode === 'all' ? index : undefined

      // 複数曲ある場合: history と現在の曲を除いた候補からランダムに選ぶ
      const excluded = new Set<number>(history)
      excluded.add(index)

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
            if (i !== index) fresh.push(i)
          }
          if (fresh.length === 0) return index
          return fresh[Math.floor(Math.random() * fresh.length)]
        }

        // repeatMode が none の場合は再生を停止
        return undefined
      }

      return candidates[Math.floor(Math.random() * candidates.length)]
    }

    // シャッフル無効時で最終曲でない場合はシンプルに次のインデックスを返却
    if (!isAtEnd) return index + 1

    // 最終曲でallの場合は先頭の曲を返却
    return playerState.value.repeatMode === 'all' ? 0 : undefined
  }

  // 前に再生した曲のindexを計算して返却するロジック
  // 状態変更は行わない。上位関数である previous() で状態変更は実施
  // 詳細は README.md を参照
  const calcPreviousIndex = (): number | undefined => {
    if (index < 0 || tracks.value.length === 0) return undefined
    const isAtStart = index === 0
    const hasHistory = history.length > 0
    const hasMultiple = tracks.value.length > 1

    // repeat one は常に現在の曲を返す
    if (playerState.value.repeatMode === 'one') return index

    // シャッフル有効時
    if (playerState.value.shuffleEnabled) {
      // historyがある場合
      if (hasHistory) return history[history.length - 1]
      // historyがなければシャッフル無効時と同様のロジック
      if (!isAtStart) return index - 1
      return playerState.value.repeatMode === 'all'
        ? hasMultiple
          ? tracks.value.length - 1
          : 0
        : undefined
    }

    // シャッフル無効時: 先頭の曲でない場合はシンプルに前のインデックスを返却
    if (!isAtStart) return index - 1
    // 先頭の曲でallで複数の曲がある場合は最後の曲を返却
    return playerState.value.repeatMode === 'all'
      ? hasMultiple
        ? tracks.value.length - 1
        : 0
      : undefined
  }

  return {
    playerState,
    tracks,
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
    totalDurationLabel,
    currentPositionLabel,
    remainDurationLabel,
    selectTrackById,
    getTrackById,
    disposeEngine,
  }
})
