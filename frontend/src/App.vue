<template>
  <!-- vhではなくスマホのURLバーを考慮したdvhを利用する -->
  <v-app>
    <keep-alive include="Home,Detail">
      <v-main class="d-flex flex-column" style="height: 100dvh">
        <router-view style="min-height: 0" />
      </v-main>
    </keep-alive>

    <MusicPlayerFooter />
  </v-app>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/presentation/stores/useMusicStore";
import MusicPlayerFooter from "@/presentation/view/components/MusicPlayerFooter.vue";
import { onMounted, onUnmounted } from "vue";
import { useMusicPlayerStore } from "./presentation/stores/useMusicPlayerStore";

const musicStore = useMusicStore();
const musicPlayerStore = useMusicPlayerStore();

onMounted(() => {
  musicStore.listMusic();
});

onUnmounted(() => {
  musicPlayerStore.disposeEngine();
});
</script>

<!-- グローバルCSS定義 -->
<style>
/* 全ての v-row 内 v-col のpaddingを0で初期化 */
.v-row > .v-col {
  padding: 0 !important;
}

/* height固定の影響のためか
スクロールできないのにスクロールバーが表示されるためhiddenで非表示にする */
html {
  overflow: hidden;
}
</style>
