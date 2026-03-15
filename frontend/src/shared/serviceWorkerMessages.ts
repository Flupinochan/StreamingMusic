// Service WorkerとDOMでやり取りするメッセージの定義

export const SET_OFFLINE_MODE_MESSAGE_TYPE = 'SET_OFFLINE_MODE' as const

export type SetOfflineModeMessage = {
  type: typeof SET_OFFLINE_MODE_MESSAGE_TYPE
  enabled: boolean
}
