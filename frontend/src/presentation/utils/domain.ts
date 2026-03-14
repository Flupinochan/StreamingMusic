// デフォルトでは自身のドメインを取得
// 開発環境などでアクセス先を変えたい場合に.env.localファイルにドメインを記載
export function getOwnUrl(): string {
  const env = import.meta.env.VITE_MEDIA_HOST as string | undefined
  const url = env && env.length > 0 ? env : window.location.origin
  return url
}
