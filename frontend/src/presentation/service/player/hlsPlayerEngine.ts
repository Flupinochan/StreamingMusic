import type Hls from 'hls.js'
import type { ErrorData } from 'hls.js'
import { HlsClass, HlsEvents, loadHls } from '../../utils/hls'
import type { PlayerEngine } from './playerEngine'

export class HlsPlayerEngine implements PlayerEngine {
  private audio: HTMLAudioElement
  private loadingManifestUrl?: string
  private hls?: Hls
  private removeListeners: Set<() => void> = new Set()
  private onFatalError?: (error: Error) => void
  private timeUpdateHandler?: () => void
  private endedHandler?: () => void

  constructor() {
    this.audio = new Audio()
  }

  async load(manifestUrl: string): Promise<void> {
    // If the same manifest is already loaded, treat as no-op
    if (this.loadingManifestUrl === manifestUrl) return

    // Ensure audio is reset before loading a new source
    this.destroy()

    this.loadingManifestUrl = manifestUrl

    // dynamically load Hls.js
    await loadHls()
    if (!HlsClass || !HlsEvents) {
      throw new Error('Hls not loaded')
    }

    // init engine
    this.hls = new HlsClass({ startOnSegmentBoundary: true, maxBufferHole: 0.25 })
    this.hls.loadSource(manifestUrl)
    this.hls.attachMedia(this.audio)

    // Recover from errors events
    const onHlsError = (_: unknown, data: ErrorData): void => {
      if (!data?.fatal) return
      if (data.type === HlsClass!.ErrorTypes.MEDIA_ERROR) {
        this.hls?.recoverMediaError()
      } else if (data.type === HlsClass!.ErrorTypes.NETWORK_ERROR) {
        this.hls?.startLoad()
      } else {
        this.destroy()
        this.onFatalError?.(new Error(`HLS error: ${data.type} - ${data.details}`))
      }
    }
    this.hls.on(HlsEvents.ERROR, onHlsError)
    this.removeListeners.add(() => this.hls?.off(HlsEvents!.ERROR, onHlsError))

    // HLS Eventデバッグ用
    // Object.values(HlsEvents).forEach((event) => {
    //   this.hls!.on(event as any, (_: unknown, data: unknown) => {
    //     console.log('[HLS Event]', event, data)
    //   })
    // })

    const onAudioError = (): void => {
      this.destroy()
      this.onFatalError?.(
        new Error(
          `Audio error: code=${this.audio.error?.code} message=${this.audio.error?.message}`,
        ),
      )
    }
    this.audio.addEventListener('error', onAudioError)
    this.removeListeners.add(() => this.audio.removeEventListener('error', onAudioError))

    // wait ready
    await new Promise<void>((resolve, reject) => {
      this.hls!.once(HlsEvents!.MANIFEST_PARSED, () => resolve())
      this.hls!.once(HlsEvents!.ERROR, (_: unknown, data: ErrorData) => {
        if (data?.fatal) reject(new Error(`HLS load error: ${data.type} - ${data.details}`))
      })
    })
  }

  async play(): Promise<void> {
    await this.audio.play()
  }

  pause(): void {
    this.audio.pause()
  }

  stop(): void {
    this.audio.pause()
    this.audio.currentTime = 0
  }

  setSeek(seconds: number): void {
    this.audio.currentTime = Math.max(0, seconds)
  }

  onTimeUpdate(listener: (currentSeconds: number, durationSeconds: number) => void): void {
    if (this.timeUpdateHandler) {
      this.audio.removeEventListener('timeupdate', this.timeUpdateHandler)
    }
    this.timeUpdateHandler = () => {
      const current = this.audio.currentTime
      const duration = Number.isFinite(this.audio.duration) ? this.audio.duration : 0
      listener(current, duration)
    }
    this.audio.addEventListener('timeupdate', this.timeUpdateHandler)
    this.removeListeners.add(() =>
      this.audio.removeEventListener('timeupdate', this.timeUpdateHandler!),
    )
  }

  onEnded(listener: () => void): void {
    if (this.endedHandler) {
      this.audio.removeEventListener('ended', this.endedHandler)
    }
    this.endedHandler = () => listener()
    this.audio.addEventListener('ended', () => {
      console.log('Audio ended')
      this.endedHandler!()
    })
    this.removeListeners.add(() => this.audio.removeEventListener('ended', this.endedHandler!))
  }

  onError(listener: (error: Error) => void): void {
    this.onFatalError = listener
  }

  destroy(): void {
    this.removeListeners.forEach((fn) => fn())
    this.removeListeners.clear()

    this.audio.pause()
    this.audio.currentTime = 0
    this.audio.removeAttribute('src')
    this.audio.src = ''
    this.audio.load()

    this.hls?.destroy()
    this.hls = undefined

    this.loadingManifestUrl = undefined
  }
}
