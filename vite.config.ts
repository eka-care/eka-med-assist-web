import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { minify } from "terser";
import { defineConfig } from "vite";

// Custom plugin to minify widget-loader.js using Terser and inject version-aware URLs
function processWidgetLoader(
  isProduction = true,
  mode = "dev",
  version = "latest"
) {
  return {
    name: "process-widget-loader",
    async writeBundle() {
      const loaderPath = path.resolve(__dirname, "public/widget-loader.js");
      const distPath = path.resolve(__dirname, "dist/widget-loader.js");

      if (fs.existsSync(loaderPath)) {
        let content = fs.readFileSync(loaderPath, "utf8");

        // Inject version-aware URLs
        const baseUrl = isProduction
          ? `https://cdn.ekacare.co/apollo/${mode}-${version}/`
          : mode === "stage"
          ? `https://dev-cdn.ekacare.co/apollo/${mode}-${version}/`
          : "/";

        // Replace hardcoded URLs with dynamic ones
        content = content.replace(
          /scriptUrl: "[^"]*"/,
          `scriptUrl: "${baseUrl}widget.js"`
        );
        content = content.replace(
          /cssUrl: "[^"]*"/,
          `cssUrl: "${baseUrl}assets/widget.css"`
        );

        console.log(`✓ Injected URLs in widget-loader.js: ${baseUrl}`);

        try {
          const result = await minify(content, {
            compress: {
              drop_console: isProduction, // Temporarily commented out to fix production widget issue
              drop_debugger: true,
              pure_funcs: isProduction
                ? ["console.log", "console.info", "console.debug"]
                : [], // Commented out temporarily
              unused: true, // Remove unused code
            },
            mangle: {
              // Don't mangle global variables
              reserved: ["EkaMedAssist", "EkaMedAssistWidget"],
            },
            format: {
              comments: false, // Remove all comments
            },
          });

          if (result.code) {
            fs.writeFileSync(distPath, result.code);
            console.log(
              "✓ Processed and minified widget-loader.js with Terser"
            );
          } else {
            throw new Error("Terser minification failed");
          }
        } catch (error) {
          console.error("Error minifying widget-loader.js:", error);
          // Fallback to copying original file
          fs.copyFileSync(loaderPath, distPath);
        }
      }
    },
  };
}

// This app always runs as a widget, so build it as a library
export default defineConfig(({ mode }) => {
  const isProduction = mode === "prod";
  const isStage = mode === "stage";
  const version = require("./package.json").version;

  // CDN base URL for production builds
  const base = isProduction
    ? `https://cdn.ekacare.co/apollo/${mode}-${version}/`
    : isStage
    ? `https://dev-cdn.ekacare.co/apollo/${mode}-${version}/`
    : "./";

  return {
    base,
    plugins: [
      react(),
      tailwindcss(),
      processWidgetLoader(isProduction, mode, version),
    ],
    esbuild: {
      // Only drop console logs in production builds, keep them in development
      drop: isProduction ? ["console", "debugger"] : [],
    },
    define: {
      "process.env": {},
      "process.env.NODE_ENV": JSON.stringify(
        isProduction ? "prod" : isStage ? "stage" : "dev"
      ),
    },
    build: {
      outDir: "dist",
      lib: {
        entry: path.resolve(__dirname, "src/main.tsx"),
        name: "EkaMedAssistWidget",
        fileName: "widget",
        formats: ["iife"],
      },
      rollupOptions: {
        // Bundle everything together - no external dependencies
        external: [],
        output: {
          format: "iife",
          name: "EkaMedAssistWidget",
          entryFileNames: "widget.js",
          chunkFileNames: "assets/[name].js",
          assetFileNames: "assets/[name].[ext]",
          // Ensure all dependencies are bundled
          manualChunks: undefined,
          // Better compression
          compact: isProduction,
        },
        // Improve tree shaking
        // treeshake: isProduction ? {
        //     moduleSideEffects: false,
        //     propertyReadSideEffects: false,
        //     unknownGlobalSideEffects: false,
        // } : false,
      },
      // Bundle all dependencies
      ssr: false,
      target: "es2015",
      // Use terser for production minification with optimization, esbuild for development
      minify: isProduction ? "terser" : "esbuild",
      terserOptions: isProduction
        ? {
            compress: {
              drop_console: true,
              drop_debugger: true,
              pure_funcs: ["console.log", "console.info", "console.debug"],
              unused: true,
              dead_code: true,
            },
            mangle: {
              safari10: true, // Better compression for Safari 10+
            },
            format: {
              comments: false, // Remove all comments
            },
          }
        : undefined,
      sourcemap: false,
      // Ensure CSS is extracted and bundled
      cssCodeSplit: false,
      // Bundle size optimization
      chunkSizeWarningLimit: 1000,
      // Faster builds with better caching in production
      reportCompressedSize: isProduction,
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
    optimizeDeps: {
      include: ["react", "react-dom", "zustand"],
      // Force optimization for better tree shaking in production
      // force: isProduction,
    },
  };
});
