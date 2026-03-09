/**
 * Hlsの型定義と動的インポートのユーティリティ関数
 */
import type Hls from 'hls.js'

export type HlsEventsType = typeof Hls.Events

type HlsModuleShape = {
  default: typeof Hls
  Events: HlsEventsType
}

function isHlsModuleShape(mod: unknown): mod is HlsModuleShape {
  return typeof mod === 'object' && mod !== null && 'default' in mod && 'Events' in mod
}

function isHlsModuleAltShape(mod: unknown): mod is Hls & { Events: HlsEventsType } {
  return typeof mod === 'object' && mod !== null && 'Events' in mod
}

export let HlsClass: typeof Hls | undefined
export let HlsEvents: HlsEventsType | undefined

export const loadHls = async (): Promise<void> => {
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
