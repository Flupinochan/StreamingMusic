export interface PlayerEngine {
  load(manifestUrl: string): Promise<void>
  play(): Promise<void>
  pause(): void
  stop(): void
  setSeek(seconds: number): void
  onTimeUpdate(listener: (currentSeconds: number, durationSeconds: number) => void): void
  onEnded(listener: () => void): void
  onError(listener: (event: Error) => void): void
  destroy(): void
}
