// S3に保存するテキストや音楽や画像データなどのバイナリデータ
export interface BinaryObjectParams {
  data: ArrayBuffer;
  type: string;
  name: string;
}

export class BinaryObject {
  protected constructor(
    // 実データ
    private readonly _data: ArrayBuffer,
    // データサイズ (バイト単位)
    private readonly _size: number,
    // MIMEタイプ (例: "audio/mpeg", "image/jpeg")
    private readonly _type: string,
    // ファイル名 (例: "song.mp3", "cover.jpg")
    private readonly _name: string,
  ) {
    if (_data.byteLength === 0) {
      throw new Error("Data cannot be empty");
    }
    if (_size !== _data.byteLength) {
      throw new Error("Size must match the byte length of data");
    }
    if (!_type || _type.trim() === "") {
      throw new Error("MIME type is required");
    }
    if (!_name || _name.trim() === "") {
      throw new Error("Name is required");
    }
  }

  public static create(params: BinaryObjectParams): BinaryObject {
    const { data, type, name } = params;
    return new BinaryObject(data, data.byteLength, type, name);
  }

  public static async fromFile(file: File): Promise<BinaryObject> {
    const data = await file.arrayBuffer();
    return this.create({ data, type: file.type, name: file.name });
  }

  public toBlob(): Blob {
    return new Blob([this._data], { type: this._type });
  }

  public isAudio(): boolean {
    return this._type.startsWith("audio/");
  }

  public isImage(): boolean {
    return this._type.startsWith("image/");
  }

  public isManifest(): boolean {
    return (
      this._type === "application/vnd.apple.mpegurl" ||
      this._type === "audio/mpegurl" ||
      this._type === "application/x-mpegURL"
    );
  }

  get data(): ArrayBuffer {
    return this._data;
  }

  get size(): number {
    return this._size;
  }

  get type(): string {
    return this._type;
  }

  get name(): string {
    return this._name;
  }
}
