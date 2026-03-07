export class MusicId {
  private constructor(private readonly _value: string) {
    if (_value.trim() === "") {
      throw new Error("MusicId must be a non-empty string");
    }
  }

  static createNewId(): MusicId {
    const id = crypto.randomUUID();
    return new MusicId(id);
  }

  /**
   * 新規作成用ではないため注意!!
   * @param id
   * @returns
   */
  static createFromString(id: string): MusicId {
    return new MusicId(id);
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
