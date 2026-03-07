<template>
  <MusicListPlayer />

  <div class="container-fluid">
    <v-row>
      <v-col cols="12" md="6">
        <v-file-input
          label="Music file input"
          accept="audio/*"
          variant="solo"
          show-size
          @change="onFileSelected"
        />
      </v-col>
      <v-col cols="12" md="6">
        <v-file-input
          label="Artwork image file input"
          accept="image/*"
          variant="solo"
          show-size
          @change="onArtworkSelected"
        />
      </v-col>
    </v-row>

    <v-row>
      <v-col cols="12" md="6">
        <v-btn
          :disabled="
            !selectedMusicFile || !selectedArtworkFile || musicStore.loading
          "
          :loading="musicStore.loading"
          aria-label="音楽ファイルをアップロード"
          @click="handleUpload"
        >
          アップロード
        </v-btn>
      </v-col>
      <v-col cols="12" md="6">
        <v-btn
          :disabled="
            !musicPlayerStore.playerState.musicId || musicStore.loading
          "
          :loading="musicStore.loading"
          aria-label="音楽ファイルを削除"
          @click="handleDelete"
        >
          削除
        </v-btn>
      </v-col>
    </v-row>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/presentation/stores/useMusicStore";
import { segmentAudioFile } from "@/presentation/utils/ffmpegHelpers";
import MusicListPlayer from "@/presentation/view/components/MusicListPlayer.vue";
import { getCurrentUser } from "aws-amplify/auth";
import { onBeforeUnmount, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useMusicPlayerStore } from "../stores/useMusicPlayerStore";

const musicStore = useMusicStore();
const musicPlayerStore = useMusicPlayerStore();

const selectedMusicFile = ref<File | null>(null);
const selectedMusicTitle = ref<string | null>(null);
const selectedMusicBytes = ref<number | null>(null);
const selectedArtworkFile = ref<File | null>(null);
const selectedMusicDurationSeconds = ref<number | null>(null);

const getAudioDurationSeconds = (file: File): Promise<number> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    audio.preload = "metadata";

    audio.onloadedmetadata = (): void => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      URL.revokeObjectURL(url);
      resolve(Math.round(duration));
    };

    audio.onerror = (): void => {
      URL.revokeObjectURL(url);
      reject(new Error("failed to load audio metadata"));
    };

    audio.src = url;
  });

const onFileSelected = async (event: Event): Promise<void> => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;
  const file = input.files[0];
  selectedMusicFile.value = file;
  // store title (filename without extension) and size
  const idx = file.name.lastIndexOf(".");
  selectedMusicTitle.value = idx > 0 ? file.name.slice(0, idx) : file.name;
  selectedMusicBytes.value = file.size;

  selectedMusicDurationSeconds.value = null;
  try {
    selectedMusicDurationSeconds.value = await getAudioDurationSeconds(
      selectedMusicFile.value,
    );
  } catch (error) {
    console.warn("duration calc error", error);
  }
};

const onArtworkSelected = (event: Event): void => {
  const input = event.target as HTMLInputElement;
  if (!input.files?.length) return;
  selectedArtworkFile.value = input.files[0];
};

const handleUpload = async (): Promise<void> => {
  if (!selectedMusicFile.value) return;
  if (!selectedArtworkFile.value) return;
  try {
    const thumbnailBlob = await createThumbnail(selectedArtworkFile.value);

    // HLS分割を実行
    const { manifestFile, segmentFiles: segments } = await segmentAudioFile(
      selectedMusicFile.value,
    );

    await musicStore.uploadMusic({
      musicTitle: selectedMusicTitle.value ?? "",
      musicDataBytes: selectedMusicBytes.value ?? 0,
      musicDurationSeconds: selectedMusicDurationSeconds.value ?? 0,
      artworkImageFile: selectedArtworkFile.value,
      artworkThumbnailImageBlob: thumbnailBlob,
      manifestFile: manifestFile,
      segmentFiles: segments,
    });

    await musicStore.listMusic();
  } catch (error) {
    console.error("upload error", error);
  }
};

const handleDelete = async (): Promise<void> => {
  if (!musicPlayerStore.playerState.musicId) return;

  const music = musicPlayerStore.getTrackById(
    musicPlayerStore.playerState.musicId,
  );
  if (!music) return;

  await musicStore.removeMusic({
    musicId: music?.musicId,
    manifestPath: music?.manifestPath,
  });

  await musicStore.listMusic();
};

async function createThumbnail(file: File, maxSize = 300): Promise<Blob> {
  const img = new Image();
  const reader = new FileReader();

  return new Promise((resolve, reject) => {
    reader.onload = (): void => {
      img.src = reader.result as string;
    };

    img.onload = (): void => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject();

      const scale = Math.min(maxSize / img.width, maxSize / img.height);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (!blob) return reject();
          resolve(blob);
        },
        "image/jpeg",
        0.8,
      );
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const router = useRouter();
const handleKeydown = (e: KeyboardEvent): void => {
  if (e.ctrlKey && e.altKey && e.shiftKey && e.key.toLowerCase() === "a") {
    router.push({ path: "home" });
  }
};

onMounted(async () => {
  window.addEventListener("keydown", handleKeydown);

  try {
    await getCurrentUser();
  } catch {
    router.push({ name: "auth", query: { redirect: "/admin" } });
  }
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped></style>
