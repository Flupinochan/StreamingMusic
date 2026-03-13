import type { MusicMetadata } from '@/domain/entities/musicMetadata'
import type { MusicMetadataRepository } from '@/domain/repositories/musicMetadataRepository'
import type { MusicId } from '@/domain/value_objects/musicId'
import { musicMetadataDtoToMusicMetadata } from '@/infrastructure/repositories/mapper/musicMetadataMapper'
import { MusicMetadataRepositoryRest } from '@/infrastructure/repositories/musicMetadataRepositoryRest'
import { toCreateMusicMetadataRequestDto } from './mapper/musicMetadataApiMapper'

export class MusicMetadataRepositoryImpl implements MusicMetadataRepository {
  private readonly repo: MusicMetadataRepositoryRest

  constructor(repo: MusicMetadataRepositoryRest) {
    this.repo = repo
  }

  async listMusicMetadata(): Promise<MusicMetadata[]> {
    const items = await this.repo.listMusicMetadata()
    return items.map(musicMetadataDtoToMusicMetadata)
  }

  async createMusicMetadata(metadata: MusicMetadata): Promise<void> {
    const dto = toCreateMusicMetadataRequestDto(metadata)
    await this.repo.createMusicMetadata(dto)
  }

  async removeMusicMetadata(id: MusicId): Promise<void> {
    await this.repo.removeMusicMetadata(id.value)
  }
}
