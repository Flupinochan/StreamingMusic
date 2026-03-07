import { MusicMetadata } from '@/domain/entities/musicMetadata'
import { MusicId } from '@/domain/value_objects/musicId'
import { MusicSeconds } from '@/domain/value_objects/musicSeconds'
import { MusicSize } from '@/domain/value_objects/musicSize'
import { MusicTitle } from '@/domain/value_objects/musicTitle'
import { ArtworkImagePath } from '@/domain/value_objects/path/artworkImagePath'
import { ArtworkThumbnailImagePath } from '@/domain/value_objects/path/artworkThumbnailImagePath'
import { ManifestPath } from '@/domain/value_objects/path/manifestPath'
import type { MusicMetadataDto } from '../dto/musicMetadataDto'

// Entity to DTO
export const musicMetadataToMusicMetadataDto = (musicMetadata: MusicMetadata): MusicMetadataDto => {
  return {
    id: musicMetadata.id.value,
    title: musicMetadata.title.value,
    seconds: musicMetadata.seconds.value,
    size: musicMetadata.size.value,
    manifestPath: musicMetadata.manifestPath.value,
    artworkImagePath: musicMetadata.artworkImagePath.value,
    artworkThumbnailImagePath: musicMetadata.artworkThumbnailImagePath.value,
  }
}

// DTO to Entity
export const musicMetadataDtoToMusicMetadata = (dto: MusicMetadataDto): MusicMetadata => {
  return new MusicMetadata(
    MusicId.createFromString(dto.id),
    MusicTitle.create(dto.title),
    MusicSeconds.create(dto.seconds),
    MusicSize.create(dto.size),
    ManifestPath.createFromPath(dto.manifestPath),
    ArtworkImagePath.createFromPath(dto.artworkImagePath),
    ArtworkThumbnailImagePath.createFromPath(dto.artworkThumbnailImagePath),
  )
}
