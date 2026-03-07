export class MusicSize {
  private constructor(private readonly _value: number) {
    if (!Number.isFinite(_value) || _value < 0) {
      throw new Error("MusicSize must be a finite number >= 0");
    }
  }

  static create(value: number): MusicSize {
    return new MusicSize(value);
  }

  get value(): number {
    return this._value;
  }

  getLabel(): string {
    if (this._value >= 1e9) {
      return (this._value / 1e9).toFixed(2) + " GB";
    } else if (this._value >= 1e6) {
      return (this._value / 1e6).toFixed(2) + " MB";
    } else if (this._value >= 1e3) {
      return (this._value / 1e3).toFixed(2) + " KB";
    } else {
      return this._value + " B";
    }
  }

  toString(): string {
    return this._value.toString();
  }
}
