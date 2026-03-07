export interface CreateMusicDto {
  musicTitle: string;
  musicDataBytes: number;
  // 音楽再生時間はTypeScript組み込み機能では取得できないため、フロントエンドで計算して渡す
  musicDurationSeconds: number;
  artworkImageFile: File;
  // サムネイル生成処理もフロントエンドの方が楽なので、Blobで受け取る
  artworkThumbnailImageBlob: Blob;
  // HLSマニフェスト
  manifestFile: File;
  // HLSセグメントファイル
  segmentFiles: File[];
}
