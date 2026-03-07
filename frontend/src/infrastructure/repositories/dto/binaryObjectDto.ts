export interface BinaryObjectDto {
  data: ArrayBuffer;
  byteLength: number;
  contentType: string;
  originalFilename: string;
}
