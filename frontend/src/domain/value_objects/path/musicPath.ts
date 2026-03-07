/**
 * /music/{random id}/{category}/ファイル名
 * category: music, audio, manifest, artwork, thumbnail
 */
export class MusicPath {
  protected constructor(private readonly _value: string) {
    if (!_value.startsWith("music/")) throw new Error("Invalid music path");
  }

  /**
   * getUrlでデータ取得用
   * バリデーションが効かない新規作成では利用しない!!
   * @param value
   * @returns
   */
  static from(value: string): MusicPath {
    return new MusicPath(value);
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }

  // サブクラスでカテゴリごとにチェックするためのバリデーションメソッド
  protected checkCategory(category: string): void {
    const re = new RegExp(`^music/[^/]+/${category}/`);
    if (!re.test(this._value)) {
      throw new Error(`path is not in ${category} category`);
    }
  }
}
