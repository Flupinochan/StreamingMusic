import { MusicPath } from "./musicPath";

/**
 * 内部に保持するのは末尾スラッシュ付きのプレフィックスのみ。
 * e.g. "music/abc123/"
 */
export class MusicFolderPath {
  private constructor(private readonly _value: string) {
    if (!/^music\/[^/]+\/$/.test(_value)) {
      throw new Error("Invalid music folder path");
    }
  }

  /**
   * PathS3 からmusic配下のフォルダパスを抜き出して生成
   */
  static fromPath(path: MusicPath): MusicFolderPath {
    const m = path.value.match(/^music\/([^/]+)\//);
    if (!m) {
      throw new Error("not under a music title folder");
    }
    return new MusicFolderPath(`music/${m[1]}/`);
  }

  get value(): string {
    return this._value;
  }

  /**
   * S3 API に渡すときに文字列化
   */
  toString(): string {
    return this._value;
  }
}
