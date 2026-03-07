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
    this.musicDataRepository.remove(path)
    this.musicMetadataRepository.removeMusicMetadata(id)
  }
}
