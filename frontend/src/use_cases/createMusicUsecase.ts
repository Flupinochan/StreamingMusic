import { MusicMetadata } from '@/domain/entities/musicMetadata'
import type { MusicDataRepository } from '@/domain/repositories/musicDataRepository'
import type { MusicMetadataRepository } from '@/domain/repositories/musicMetadataRepository'
import { MusicSeconds } from '@/domain/value_objects/musicSeconds'
import { MusicSize } from '@/domain/value_objects/musicSize'
import { MusicTitle } from '@/domain/value_objects/musicTitle'
import { ManifestPath } from '@/domain/value_objects/path/manifestPath'
import type { CreateMusicDto } from '@/use_cases/createMusicDto'
import { createMusicDtoToCreateMusicInput } from './createMusicMapper'

export class CreateMusicUsecase {
  constructor(
    private readonly musicDataRepository: MusicDataRepository,
    private readonly musicMetadataRepository: MusicMetadataRepository,
  ) {}

  async uploadMusic(input: CreateMusicDto): Promise<void> {
    const {
      artworkImage,
      artworkImagePath,
      artworkThumbnailImage,
      artworkThumbnailImagePath,
      musicFile,
      musicPath,
      title,
      seconds,
      size,
    } = await createMusicDtoToCreateMusicInput(input)

    // upload artwork and raw music file
    await Promise.all([
      this.musicDataRepository.upload(artworkImagePath, artworkImage),
      this.musicDataRepository.upload(artworkThumbnailImagePath, artworkThumbnailImage),
      this.musicDataRepository.upload(musicPath, musicFile),
    ])

    // ask server to process the raw file and produce manifest
    const manifestPath = await this.musicDataRepository.process(musicPath)

    // build metadata with returned manifest path
    const musicMetadata = MusicMetadata.create(
      MusicTitle.create(title),
      MusicSeconds.create(seconds),
      MusicSize.create(size),
      ManifestPath.createFromPath(manifestPath),
      artworkImagePath,
      artworkThumbnailImagePath,
    )

    await this.musicMetadataRepository.createMusicMetadata(musicMetadata)
  }
}
