// seek bar用の時間表示をMM:SS形式に変換
export const formatSecondsToMMSS = (seconds: number): string => {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? seconds : 0
  const total = Math.floor(safeSeconds)
  const min = Math.floor(total / 60)
    .toString()
    .padStart(2, '0')
  const sec = Math.floor(total % 60)
    .toString()
    .padStart(2, '0')
  return `${min}:${sec}`
}
