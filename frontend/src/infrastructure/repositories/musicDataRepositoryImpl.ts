import type { MusicDataRepository } from '@/domain/repositories/musicDataRepository'
import type { MusicBinaryObject } from '@/domain/value_objects/binary/musicBinaryObject'
import type { MusicFolderPath } from '@/domain/value_objects/path/musicFolderPath'
import type { MusicPath } from '@/domain/value_objects/path/musicPath'
import { createUploadMusicDto } from '@/infrastructure/repositories/mapper/musicApiMapper'
import type { UploadRequestDto } from './dto/uploadRequestDto'
import { MusicDataRepositoryAmplify } from './musicDataRepositoryAmplify'

export class MusicDataRepositoryImpl implements MusicDataRepository {
  private readonly repo: MusicDataRepositoryAmplify

  constructor(repo: MusicDataRepositoryAmplify) {
    this.repo = repo
  }

  async upload(path: MusicPath, binary: MusicBinaryObject): Promise<void> {
    const dto: UploadRequestDto = createUploadMusicDto(path, binary)
    await this.repo.upload(dto)
  }

  async process(path: MusicPath): Promise<string> {
    return this.repo.process(path.value)
  }

  async remove(path: MusicFolderPath): Promise<void> {
    await this.repo.remove(path.value)
  }
}
