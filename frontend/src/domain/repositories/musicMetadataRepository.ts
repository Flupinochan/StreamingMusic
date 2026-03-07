import type { MusicMetadata } from '../entities/musicMetadata'
import type { MusicId } from '../value_objects/musicId'

export interface MusicMetadataRepository {
  // observableは重いため実装しない
  // observeMusicMetadata(): Observable<MusicMetadata[]>;
  listMusicMetadata(): Promise<MusicMetadata[]>
  createMusicMetadata(musicMetadata: MusicMetadata): Promise<void>
  removeMusicMetadata(id: MusicId): Promise<void>
}
