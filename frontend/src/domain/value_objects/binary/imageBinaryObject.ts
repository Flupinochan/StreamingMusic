import type { BinaryObjectParams } from "./binaryObject";
import { BinaryObject } from "./binaryObject";

export class ImageBinaryObject extends BinaryObject {
  private constructor(
    data: ArrayBuffer,
    size: number,
    type: string,
    name: string,
  ) {
    super(data, size, type, name);

    if (!this.isImage()) {
      throw new Error("MIME type must be an image type (image/*)");
    }
  }

  public static create(params: BinaryObjectParams): ImageBinaryObject {
    const { data, type, name } = params;
    return new this(data, data.byteLength, type, name);
  }

  public static async fromFile(file: File): Promise<ImageBinaryObject> {
    const data = await file.arrayBuffer();
    return this.create({ data, type: file.type, name: file.name });
  }
}
