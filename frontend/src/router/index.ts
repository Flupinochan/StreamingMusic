import type { Component } from "vue";
import {
  createRouter,
  createWebHistory,
  type RouteLocationNormalized,
} from "vue-router";

export type DetailProps = {
  musicId: string;
};

const routes = [
  {
    path: "/",
    redirect: "/home",
  },
  {
    name: "home",
    path: "/home",
    alias: ["/home"],
    component: (): Promise<{ default: Component }> =>
      import("@/presentation/view/GuestPage.vue"),
  },
  {
    name: "detail",
    path: "/detail/:id",
    alias: ["/detail/:id"],
    props: (route: RouteLocationNormalized): DetailProps => ({
      musicId: route.params.id as string,
    }),
    component: (): Promise<{ default: Component }> =>
      import("@/presentation/view/components/MusicListPlayerDetail.vue"),
  },
  {
    name: "auth",
    path: "/auth",
    component: (): Promise<{ default: Component }> =>
      import("@/presentation/view/AuthPage.vue"),
  },
  {
    name: "admin",
    meta: { requiresAuth: true },
    path: "/admin",
    component: (): Promise<{ default: Component }> =>
      import("@/presentation/view/AdminPage.vue"),
  },
];

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes,
});

// beforeEachは極力使用しない (全ページで必要な処理がある場合のみ)
// 認証が必要なページだけで設定すべき
