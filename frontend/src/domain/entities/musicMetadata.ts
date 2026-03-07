import { MusicId } from "../value_objects/musicId";
import type { MusicSeconds } from "../value_objects/musicSeconds";
import type { MusicSize } from "../value_objects/musicSize";
import type { MusicTitle } from "../value_objects/musicTitle";
import type { ArtworkImagePath } from "../value_objects/path/artworkImagePath";
import type { ArtworkThumbnailImagePath } from "../value_objects/path/artworkThumbnailImagePath";
import type { ManifestPath } from "../value_objects/path/manifestPath";

// DynamoDBに保存する音楽のメタデータ
export class MusicMetadata {
  constructor(
    public readonly id: MusicId,
    public readonly title: MusicTitle,
    public readonly seconds: MusicSeconds,
    public readonly size: MusicSize,
    public readonly manifestPath: ManifestPath,
    public readonly artworkImagePath: ArtworkImagePath,
    public readonly artworkThumbnailImagePath: ArtworkThumbnailImagePath,
  ) {}

  static create(
    title: MusicTitle,
    seconds: MusicSeconds,
    size: MusicSize,
    manifestPath: ManifestPath,
    artworkImagePath: ArtworkImagePath,
    artworkThumbnailImagePath: ArtworkThumbnailImagePath,
  ): MusicMetadata {
    return new MusicMetadata(
      MusicId.createNewId(),
      title,
      seconds,
      size,
      manifestPath,
      artworkImagePath,
      artworkThumbnailImagePath,
    );
  }
}
