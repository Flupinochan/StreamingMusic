import type { BinaryObjectParams } from "./binaryObject";
import { BinaryObject } from "./binaryObject";

export class ManifestBinaryObject extends BinaryObject {
  private constructor(
    data: ArrayBuffer,
    size: number,
    type: string,
    name: string,
  ) {
    super(data, size, type, name);

    if (!this.isManifest()) {
      throw new Error(
        "MIME type must be a manifest type (application/vnd.apple.mpegurl, audio/mpegurl, application/x-mpegURL)",
      );
    }
  }

  public static create(params: BinaryObjectParams): ManifestBinaryObject {
    const { data, type, name } = params;
    return new ManifestBinaryObject(data, data.byteLength, type, name);
  }

  public static createFromString(
    manifestString: string,
    name: string,
  ): ManifestBinaryObject {
    const encoder = new TextEncoder();
    const data = encoder.encode(manifestString).buffer;
    return this.create({ data, type: "application/vnd.apple.mpegurl", name });
  }
}
