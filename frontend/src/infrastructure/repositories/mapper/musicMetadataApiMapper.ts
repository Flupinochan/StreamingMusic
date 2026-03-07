import { MusicMetadata } from "@/domain/entities/musicMetadata";
import type { MusicMetadataDto } from "@/infrastructure/repositories/dto/musicMetadataDto";

export const toCreateMusicMetadataRequestDto = (
  entity: MusicMetadata,
): MusicMetadataDto => {
  return {
    id: entity.id.value,
    title: entity.title.value,
    seconds: entity.seconds.value,
    size: entity.size.value,
    manifestPath: entity.manifestPath.value,
    artworkImagePath: entity.artworkImagePath.value,
    artworkThumbnailImagePath: entity.artworkThumbnailImagePath.value,
  };
};
