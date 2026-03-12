// デフォルトでは自身のドメインを取得
// 開発環境などでアクセ期先を変えたい場合にenvファイルにドメインを記載
export function getOwnUrl(): string {
  const env = import.meta.env.VITE_MEDIA_HOST as string | undefined
  const url = env && env.length > 0 ? env : window.location.origin
  return url
}
