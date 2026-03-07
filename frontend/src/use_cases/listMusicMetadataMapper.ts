import type { MusicMetadata } from "@/domain/entities/musicMetadata";
import type { MusicMetadataDto } from "./musicMetadataDto";

export const musicMetadataToMusicMetadataDto = (
  musicMetadata: MusicMetadata,
): MusicMetadataDto => {
  return {
    musicId: musicMetadata.id.value,
    musicTitle: musicMetadata.title.value,
    musicSeconds: musicMetadata.seconds.value,
    musicSize: musicMetadata.size.value,
    manifestPath: musicMetadata.manifestPath.value,
    artworkImagePath: musicMetadata.artworkImagePath.value,
    artworkThumbnailImagePath: musicMetadata.artworkThumbnailImagePath.value,
  };
};
