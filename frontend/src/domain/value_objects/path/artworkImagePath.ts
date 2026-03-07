import { MusicPath } from "./musicPath";

/**
 * アートワーク画像のS3上のパスを表す値オブジェクト
 * 例: "music/{folderName}/artwork/{fileName}"
 */
export class ArtworkImagePath extends MusicPath {
  private constructor(path: string) {
    super(path);

    this.checkCategory("artwork");
  }

  static create(folderName: string, fileName: string): ArtworkImagePath {
    return new ArtworkImagePath(`music/${folderName}/artwork/${fileName}`);
  }

  /**
   * 削除時に利用
   * 新規作成用ではないため注意!!
   * @param path
   * @returns
   */
  static createFromPath(path: string): ArtworkImagePath {
    return new ArtworkImagePath(path);
  }
}
