import { MusicId } from "@/domain/value_objects/musicId";
import { ManifestPath } from "@/domain/value_objects/path/manifestPath";
import { MusicFolderPath } from "@/domain/value_objects/path/musicFolderPath";
import type { RemoveMusicDto } from "./removeMusicDto";

interface RemoveMusicInput {
  id: MusicId;
  path: MusicFolderPath;
}

export const removeMusicDtoToRemoveMusicInput = (
  dto: RemoveMusicDto,
): RemoveMusicInput => {
  const id = MusicId.createFromString(dto.musicId);

  const manifestPath = ManifestPath.createFromPath(dto.manifestPath);
  const path = MusicFolderPath.fromPath(manifestPath);

  return { id, path };
};
