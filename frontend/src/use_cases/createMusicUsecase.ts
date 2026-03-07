import type { MusicDataRepository } from "@/domain/repositories/musicDataRepository";
import type { MusicMetadataRepository } from "@/domain/repositories/musicMetadataRepository";
import type { CreateMusicDto } from "@/use_cases/createMusicDto";
import { createMusicDtoToCreateMusicInput } from "./createMusicMapper";

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
      manifest,
      manifestPath,
      segments,
      musicMetadata,
    } = await createMusicDtoToCreateMusicInput(input);

    const uploadPromises: Promise<void>[] = [
      this.musicDataRepository.upload(artworkImagePath, artworkImage),
      this.musicDataRepository.upload(
        artworkThumbnailImagePath,
        artworkThumbnailImage,
      ),
      this.musicDataRepository.upload(manifestPath, manifest),
      ...segments.map((seg) =>
        this.musicDataRepository.upload(seg.path, seg.musicData),
      ),
      this.musicMetadataRepository.createMusicMetadata(musicMetadata),
    ];

    await Promise.all(uploadPromises);
  }
}
