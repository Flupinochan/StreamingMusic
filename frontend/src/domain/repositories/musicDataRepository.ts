import type { BinaryObject } from '../value_objects/binary/binaryObject'
import type { MusicFolderPath } from '../value_objects/path/musicFolderPath'
import type { MusicPath } from '../value_objects/path/musicPath'

export interface MusicDataRepository {
  upload(path: MusicPath, binary: BinaryObject): Promise<void>
  remove(path: MusicFolderPath): Promise<void>
  process(path: MusicPath): Promise<string>
}
