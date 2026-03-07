import { MusicPath } from "./musicPath";

/**
 * 音楽データのS3上のパスを表す値オブジェクト
 * 例: "music/{folderName}/audio/{fileName}"
 */
export class AudioPath extends MusicPath {
  private constructor(path: string) {
    super(path);

    this.checkCategory("audio");
  }

  static create(folderName: string, fileName: string): AudioPath {
    return new AudioPath(`music/${folderName}/audio/${fileName}`);
  }

  /**
   * 削除時に利用
   * 新規作成用ではないため注意!!
   * @param path
   * @returns
   */
  static createFromPath(path: string): AudioPath {
    return new AudioPath(path);
  }
}
