import type { MusicDataRepository } from '@/domain/repositories/musicDataRepository'
import type { MusicMetadataRepository } from '@/domain/repositories/musicMetadataRepository'
import type { RemoveMusicDto } from './removeMusicDto'
import { removeMusicDtoToRemoveMusicInput } from './removeMusicMapper'

export class RemoveMusicUsecase {
  constructor(
    private readonly musicDataRepository: MusicDataRepository,
    private readonly musicMetadataRepository: MusicMetadataRepository,
  ) {}

  async removeMusic(input: RemoveMusicDto): Promise<void> {
    const { id, path } = removeMusicDtoToRemoveMusicInput(input)
    // ensure the data files are deleted before deleting metadata
    await this.musicDataRepository.remove(path)
    await this.musicMetadataRepository.removeMusicMetadata(id)
  }
}
