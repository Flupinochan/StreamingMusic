import { BinaryObject } from "@/domain/value_objects/binary/binaryObject";
import type { BinaryObjectDto } from "../dto/binaryObjectDto";

// Entity to DTO
export const binaryObjectToBinaryObjectDto = (
  entity: BinaryObject,
): BinaryObjectDto => {
  return {
    data: entity.data,
    byteLength: entity.size,
    contentType: entity.type,
    originalFilename: entity.name,
  };
};

// DTO to Entity
export const binaryObjectDtoToBinaryObject = (
  dto: BinaryObjectDto,
): BinaryObject => {
  return BinaryObject.create({
    data: dto.data,
    type: dto.contentType,
    name: dto.originalFilename,
  });
};

// DTO to plain object
export const binaryObjectDtoToPlainObject = (dto: BinaryObjectDto): object => ({
  data: dto.data,
  byteLength: dto.byteLength,
  contentType: dto.contentType,
  originalFilename: dto.originalFilename,
});

// Entity to plain object
export const binaryObjectToPlainObject = (entity: BinaryObject): object => ({
  data: entity.data,
  byteLength: entity.size,
  contentType: entity.type,
  originalFilename: entity.name,
});
