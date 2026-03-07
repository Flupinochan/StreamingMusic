import type { BinaryObjectDto } from "./binaryObjectDto";

export interface UploadRequestDto {
  pathS3: string;
  binary: BinaryObjectDto;
}
