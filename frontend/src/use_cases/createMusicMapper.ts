import { ImageBinaryObject } from '@/domain/value_objects/binary/imageBinaryObject'
import { MusicBinaryObject } from '@/domain/value_objects/binary/musicBinaryObject'
import { ArtworkImagePath } from '@/domain/value_objects/path/artworkImagePath'
import { ArtworkThumbnailImagePath } from '@/domain/value_objects/path/artworkThumbnailImagePath'
import { AudioPath } from '@/domain/value_objects/path/audioPath'
import type { CreateMusicDto } from './createMusicDto'

interface CreateMusicInput {
  artworkImage: ImageBinaryObject
  artworkImagePath: ArtworkImagePath
  artworkThumbnailImage: ImageBinaryObject
  artworkThumbnailImagePath: ArtworkThumbnailImagePath
  musicFile: MusicBinaryObject
  musicPath: AudioPath
  title: string
  seconds: number
  size: number
}

export const createMusicDtoToCreateMusicInput = async (
  dto: CreateMusicDto,
): Promise<CreateMusicInput> => {
  const folderName = crypto.randomUUID()

  const artworkImagePath = ArtworkImagePath.create(folderName, dto.artworkImageFile.name)
  const artworkThumbnailImagePath = ArtworkThumbnailImagePath.create(
    folderName,
    dto.artworkImageFile.name,
  )
  const musicPath = AudioPath.create(folderName, dto.musicFile.name)

  const arrayBuffer = await dto.artworkThumbnailImageBlob.arrayBuffer()
  const [artworkImage, artworkThumbnailImage, musicFile] = await Promise.all([
    ImageBinaryObject.fromFile(dto.artworkImageFile),
    ImageBinaryObject.create({
      data: arrayBuffer,
      type: dto.artworkImageFile.type,
      name: dto.artworkImageFile.name,
    }),
    MusicBinaryObject.fromFile(dto.musicFile),
  ])

  return {
    artworkImage,
    artworkImagePath,
    artworkThumbnailImage,
    artworkThumbnailImagePath,
    musicFile,
    musicPath,
    title: dto.musicTitle,
    seconds: dto.musicDurationSeconds,
    size: dto.musicDataBytes,
  }
}
