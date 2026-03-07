<template>
  <MusicListPlayer />
</template>

<script setup lang="ts">
import MusicListPlayer from "@/presentation/view/components/MusicListPlayer.vue";
import { onBeforeUnmount, onMounted } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const handleKeydown = (e: KeyboardEvent): void => {
  if (e.ctrlKey && e.altKey && e.shiftKey && e.key.toLowerCase() === "a") {
    router.push({ path: "admin" });
  }
};

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", handleKeydown);
});
</script>

<style scoped></style>
