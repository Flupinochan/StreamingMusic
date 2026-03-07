import type { MusicMetadata } from '@/domain/entities/musicMetadata'
import type { MusicMetadataRepository } from '@/domain/repositories/musicMetadataRepository'
import type { MusicId } from '@/domain/value_objects/musicId'
import { musicMetadataDtoToMusicMetadata } from '@/infrastructure/repositories/mapper/musicMetadataMapper'
import { MusicMetadataRepositoryAmplify } from '@/infrastructure/repositories/musicMetadataRepositoryAppSync'
import { toCreateMusicMetadataRequestDto } from './mapper/musicMetadataApiMapper'

export class MusicMetadataRepositoryImpl implements MusicMetadataRepository {
  private readonly repo: MusicMetadataRepositoryAmplify

  constructor(repo: MusicMetadataRepositoryAmplify) {
    this.repo = repo
  }

  // observableは重いため現状は利用しない
  // observeMusicMetadata(): Observable<MusicMetadata[]> {
  //   const source = this.repo.observeMusicMetadata()

  //   return {
  //     subscribe(observer: Observer<MusicMetadata[]>): Subscription {
  //       const sub = source.subscribe({
  //         next: (dtos) => {
  //           const entities = dtos.map(musicMetadataDtoToMusicMetadata)
  //           observer.next(entities)
  //         },
  //         error: (e) => observer.error?.(e),
  //       })

  //       return {
  //         unsubscribe: (): void => sub.unsubscribe(),
  //       }
  //     },
  //   }
  // }

  async listMusicMetadata(): Promise<MusicMetadata[]> {
    const items = await this.repo.listMusicMetadata()
    return items.map(musicMetadataDtoToMusicMetadata)
  }

  async createMusicMetadata(metadata: MusicMetadata): Promise<void> {
    const dto = toCreateMusicMetadataRequestDto(metadata)
    await this.repo.createMusicMetadata(dto)
  }

  async removeMusicMetadata(id: MusicId): Promise<void> {
    await this.repo.removeMusicMetadata({ id: id.value })
  }
}
