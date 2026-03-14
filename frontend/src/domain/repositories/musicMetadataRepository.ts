import type { MusicMetadata } from '../entities/musicMetadata'
import type { MusicId } from '../value_objects/musicId'

export interface MusicMetadataRepository {
  listMusicMetadata(): Promise<MusicMetadata[]>
  createMusicMetadata(musicMetadata: MusicMetadata): Promise<void>
  removeMusicMetadata(id: MusicId): Promise<void>
}
