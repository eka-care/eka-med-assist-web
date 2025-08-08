import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: [
      {
        find: "@/lib/utils",
        replacement: "/packages/ui/base/src/shadcn-ui/lib/utils",
      },
      {
        find: "@",
        replacement: "/src",
      },
      {
        find: "@atoms",
        replacement: "/src/atoms/index.ts",
      },
      {
        find: "@ui",
        replacement: "/packages/ui/base/src",
      },
      {
        find: "@ui-components",
        replacement: "/packages/ui/base/src/shadcn-ui/components/ui",
      },
      {
        find: "@ui-lib",
        replacement: "/packages/ui/base/src/shadcn-ui/lib",
      },
      {
        find: "@ui-eka",
        replacement: "/packages/ui/base/src/eka-ui",
      },
    ],
  },
});
