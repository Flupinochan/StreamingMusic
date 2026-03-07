export class MusicTitle {
  private constructor(private readonly _value: string) {
    if (_value.trim() === "") {
      throw new Error("MusicTitle must be a non-empty string");
    }
  }

  static create(value: string): MusicTitle {
    return new MusicTitle(value);
  }

  get value(): string {
    return this._value;
  }

  toString(): string {
    return this._value;
  }
}
