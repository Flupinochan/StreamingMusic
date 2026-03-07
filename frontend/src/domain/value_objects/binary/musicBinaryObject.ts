import type { BinaryObjectParams } from "./binaryObject";
import { BinaryObject } from "./binaryObject";

export class MusicBinaryObject extends BinaryObject {
  private constructor(
    data: ArrayBuffer,
    size: number,
    type: string,
    name: string,
  ) {
    super(data, size, type, name);

    if (!this.isAudio()) {
      throw new Error("MIME type must be an audio type (audio/*)");
    }
  }

  public static create(params: BinaryObjectParams): MusicBinaryObject {
    const { data, type, name } = params;
    return new this(data, data.byteLength, type, name);
  }

  public static async fromFile(file: File): Promise<MusicBinaryObject> {
    const data = await file.arrayBuffer();
    return this.create({ data, type: file.type, name: file.name });
  }

  public get musicTitle(): string {
    // 拡張子を除いたファイル名をタイトルとする
    const idx = this.name.lastIndexOf(".");
    return idx > 0 ? this.name.slice(0, idx) : this.name;
  }
}
