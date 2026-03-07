import type { MusicMetadataRepository } from '@/domain/repositories/musicMetadataRepository'
import { musicMetadataToMusicMetadataDto } from './listMusicMetadataMapper'
import type { MusicMetadataDto } from './musicMetadataDto'

export class ListMusicMetadataUsecase {
  constructor(private readonly musicMetadataRepository: MusicMetadataRepository) {}

  async listMusicMetadata(): Promise<MusicMetadataDto[]> {
    const entities = await this.musicMetadataRepository.listMusicMetadata()
    return entities.map((entity) => musicMetadataToMusicMetadataDto(entity))
  }
}
