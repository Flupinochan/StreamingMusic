import { computed, type ComputedRef } from "vue";
import { useDisplay } from "vuetify";

export const useResponsiveButton = (): { btnSize: ComputedRef<string> } => {
  const { name } = useDisplay();

  const btnSize = computed(() => {
    switch (name.value) {
      case "xs":
        return "default";
      case "sm":
        return "default";
      case "md":
        return "default";
      case "lg":
        return "large";
      case "xl":
        return "x-large";
      case "xxl":
        return "x-large";
      default:
        return "default";
    }
  });

  return { btnSize };
};
