import { MusicPath } from "./musicPath";

/**
 * マニフェストファイルのS3上のパスを表す値オブジェクト
 * 各pathでfolderNameを統一すること!!
 * 例: "music/{folderName}/manifest/{fileName}"
 */
export class ManifestPath extends MusicPath {
  private constructor(path: string) {
    super(path);

    this.checkCategory("manifest");
  }

  static create(folderName: string, fileName: string): ManifestPath {
    return new ManifestPath(`music/${folderName}/manifest/${fileName}`);
  }

  /**
   * 削除時に利用
   * 新規作成用ではないため注意!!
   * @param path
   * @returns
   */
  static createFromPath(path: string): ManifestPath {
    return new ManifestPath(path);
  }
}
