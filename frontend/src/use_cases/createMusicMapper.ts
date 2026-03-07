import { MusicMetadata } from "@/domain/entities/musicMetadata";
import { ImageBinaryObject } from "@/domain/value_objects/binary/imageBinaryObject";
import { ManifestBinaryObject } from "@/domain/value_objects/binary/manifestBinaryObject";
import { MusicBinaryObject } from "@/domain/value_objects/binary/musicBinaryObject";
import { MusicSeconds } from "@/domain/value_objects/musicSeconds";
import { MusicSize } from "@/domain/value_objects/musicSize";
import { MusicTitle } from "@/domain/value_objects/musicTitle";
import { ArtworkImagePath } from "@/domain/value_objects/path/artworkImagePath";
import { ArtworkThumbnailImagePath } from "@/domain/value_objects/path/artworkThumbnailImagePath";
import { AudioPath } from "@/domain/value_objects/path/audioPath";
import { ManifestPath } from "@/domain/value_objects/path/manifestPath";
import type { CreateMusicDto } from "./createMusicDto";

interface CreateMusicInput {
  artworkImage: ImageBinaryObject;
  artworkImagePath: ArtworkImagePath;
  artworkThumbnailImage: ImageBinaryObject;
  artworkThumbnailImagePath: ArtworkThumbnailImagePath;
  manifest: ManifestBinaryObject;
  manifestPath: ManifestPath;
  segments: Array<{ path: AudioPath; musicData: MusicBinaryObject }>;
  musicMetadata: MusicMetadata;
}

export const createMusicDtoToCreateMusicInput = async (
  dto: CreateMusicDto,
): Promise<CreateMusicInput> => {
  const folderName = crypto.randomUUID();

  const manifestPath = ManifestPath.create(folderName, dto.manifestFile.name);
  const artworkImagePath = ArtworkImagePath.create(
    folderName,
    dto.artworkImageFile.name,
  );
  const artworkThumbnailImagePath = ArtworkThumbnailImagePath.create(
    folderName,
    dto.artworkImageFile.name,
  );

  const arrayBuffer = await dto.artworkThumbnailImageBlob.arrayBuffer();
  const [manifest, artworkImage, artworkThumbnailImage] = await Promise.all([
    ManifestBinaryObject.fromFile(dto.manifestFile),
    ImageBinaryObject.fromFile(dto.artworkImageFile),
    ImageBinaryObject.create({
      data: arrayBuffer,
      type: dto.artworkImageFile.type,
      name: dto.artworkImageFile.name,
    }),
  ]);

  const segments: Array<{
    path: AudioPath;
    musicData: MusicBinaryObject;
  }> = [];
  if (dto.segmentFiles.length === 0) {
    throw new Error("HLS segments must be provided");
  }
  for (const seg of dto.segmentFiles) {
    const segmentBinary = await MusicBinaryObject.fromFile(seg);
    const segmentPath = AudioPath.create(folderName, seg.name);
    segments.push({ path: segmentPath, musicData: segmentBinary });
  }

  const musicMetadata = MusicMetadata.create(
    MusicTitle.create(dto.musicTitle),
    MusicSeconds.create(dto.musicDurationSeconds),
    MusicSize.create(dto.musicDataBytes),
    manifestPath,
    artworkImagePath,
    artworkThumbnailImagePath,
  );

  return {
    artworkImage,
    artworkImagePath,
    artworkThumbnailImage,
    artworkThumbnailImagePath,
    manifest,
    manifestPath,
    segments,
    musicMetadata,
  };
};
