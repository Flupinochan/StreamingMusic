import { MusicPath } from "./musicPath";

/**
 * アートワークサムネイル画像のS3上のパスを表す値オブジェクト
 * 例: "music/{folderName}/thumbnail/{fileName}"
 */
export class ArtworkThumbnailImagePath extends MusicPath {
  private constructor(path: string) {
    super(path);

    this.checkCategory("thumbnail");
  }

  static create(
    folderName: string,
    fileName: string,
  ): ArtworkThumbnailImagePath {
    return new ArtworkThumbnailImagePath(
      `music/${folderName}/thumbnail/${fileName}`,
    );
  }

  /**
   * 削除時に利用
   * 新規作成用ではないため注意!!
   * @param path
   * @returns
   */
  static createFromPath(path: string): ArtworkThumbnailImagePath {
    return new ArtworkThumbnailImagePath(path);
  }
}
