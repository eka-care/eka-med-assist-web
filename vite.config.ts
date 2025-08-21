import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// This app always runs as a widget, so build it as a library
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    outDir: "dist",
    // lib: {
    //   entry: path.resolve(__dirname, "src/main.tsx"),
    //   name: "ApolloWidget",
    //   fileName: "widget",
    //   formats: ["iife"],
    // },
    rollupOptions: {
      // Bundle everything together - no external dependencies
      // external: [],
      output: {
        format: "iife",
        entryFileNames: "assets/[name].js",
        chunkFileNames: "assets/[name].js",
        assetFileNames: "assets/[name].[ext]",
        // Ensure all dependencies are bundled
        manualChunks: undefined,
        // Global variable name
        name: "EkaWidgetApp",
        // Ensure all dependencies are bundled
        globals: {},
      },
    },
    // Bundle all dependencies
    ssr: false,
    target: "es2015",
    minify: "esbuild",
    sourcemap: false,
    // Ensure CSS is extracted
    cssCodeSplit: false,
    // Bundle size optimization
    chunkSizeWarningLimit: 1000,
  },
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
  },
  define: {
    "process.env.NODE_ENV": JSON.stringify(
      process.env.NODE_ENV || "production"
    ),
  },
  optimizeDeps: {
    include: ["react", "react-dom", "zustand"],
  },
});
