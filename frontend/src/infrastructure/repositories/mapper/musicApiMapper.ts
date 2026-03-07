import { BinaryObject } from "@/domain/value_objects/binary/binaryObject";
import type { MusicPath } from "@/domain/value_objects/path/musicPath";
import { binaryObjectToBinaryObjectDto } from "@/infrastructure/repositories/mapper/binaryObjectMapper";
import type { UploadRequestDto } from "../dto/uploadRequestDto";

export const createUploadMusicDto = (
  path: MusicPath,
  binary: BinaryObject,
): UploadRequestDto => {
  return {
    pathS3: path.value,
    binary: binaryObjectToBinaryObjectDto(binary),
  };
};
