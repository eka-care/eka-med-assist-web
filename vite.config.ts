import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/components": path.resolve(
        __dirname,
        "./packages/ui/base/src/shadcn-ui/components"
      ),
      "@ui": path.resolve(__dirname, "./packages/ui/base/src"),
      "@atoms": path.resolve(__dirname, "./src/atoms/index.ts"),
      "@eka-ui": path.resolve(__dirname, "./packages/ui/base/src/eka-ui"),
      "@/lib/utils": path.resolve(
        __dirname,
        "./packages/ui/base/src/shadcn-ui/lib/utils"
      ),
      "@": path.resolve(__dirname, "./src"),
      "@/hooks": path.resolve(
        __dirname,
        "./packages/ui/base/src/shadcn-ui/hooks"
      ),
      "@ui-components": path.resolve(
        __dirname,
        "./packages/ui/base/src/shadcn-ui/components/ui"
      ),
    },
    // alias: [
    //   {
    //     find: "@/lib/utils",
    //     replacement: "/packages/ui/base/src/shadcn-ui/lib/utils",
    //   },
    //   {
    //     find: "@",
    //     replacement: "/src",
    //   },
    //   {
    //     find: "@atoms",
    //     replacement: "/src/atoms/index.ts",
    //   },
    //   {
    //     find: "@ui",
    //     replacement: "/packages/ui/base/src",
    //   },
    //   {
    //     find: "@ui-components",
    //     replacement: "/packages/ui/base/src/shadcn-ui/components/ui",
    //   },
    //   {
    //     find: "@ui-lib",
    //     replacement: "/packages/ui/base/src/shadcn-ui/lib",
    //   },
    //   {
    //     find: "@ui-eka",
    //     replacement: "/packages/ui/base/src/eka-ui",
    //   },
    //   // Add missing aliases for UI components
    //   {
    //     "@/components" : path.resolve(__dirname, "./packages/ui/base/src/shadcn-ui/components"),
    //   },
    //   {
    //     find: "@eka-ui",
    //     replacement: "/packages/ui/base/src/eka-ui",
    //   },
    //   // Add missing aliases for UI package dependencies
    // ],
  },
});
