export class MusicSeconds {
  private constructor(private readonly _value: number) {
    if (!Number.isFinite(_value) || _value < 0) {
      throw new Error("MusicSeconds must be a finite number >= 0");
    }
  }

  static create(value: number): MusicSeconds {
    return new MusicSeconds(value);
  }

  get value(): number {
    return this._value;
  }

  getLabel(): string {
    const minutes = Math.floor(this._value / 60);
    const seconds = Math.floor(this._value % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  toString(): string {
    return String(this._value);
  }
}
