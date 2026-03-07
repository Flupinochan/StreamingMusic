import type { BinaryObject } from '../value_objects/binary/binaryObject'
import type { MusicFolderPath } from '../value_objects/path/musicFolderPath'
import type { MusicPath } from '../value_objects/path/musicPath'

export interface MusicDataRepository {
  upload(path: MusicPath, binary: BinaryObject): Promise<void>
  remove(path: MusicFolderPath): Promise<void>
  // trigger server-side processing (e.g. ffmpeg) for a previously uploaded file
  // returns the S3 key of the generated manifest
  process(path: MusicPath): Promise<string>
}
