import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import fs from "fs";
import path from "path";
import { minify } from "terser";
import { defineConfig } from "vite";

// Custom plugin to minify widget-loader.js using Terser
function minifyWidgetLoader() {
    return {
        name: "minify-widget-loader",
        async writeBundle() {
            const loaderPath = path.resolve(__dirname, "public/widget-loader.js");
            const distPath = path.resolve(__dirname, "dist/widget-loader.js");

            if (fs.existsSync(loaderPath)) {
                const content = fs.readFileSync(loaderPath, "utf8");

                try {
                    const result = await minify(content, {
                        compress: {
                            drop_console: true, // Keep console.log for debugging
                            drop_debugger: true,
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
                        console.log("✓ Minified widget-loader.js with Terser");
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
export default defineConfig({
    plugins: [react(), tailwindcss(), minifyWidgetLoader()],
    esbuild: {
        drop: ["console", "debugger"],
    },
    define: {
        "process.env": {},
        "process.env.NODE_ENV": JSON.stringify("production"),
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
            },
        },
        // Bundle all dependencies
        ssr: false,
        target: "es2015",
        minify: "esbuild",
        sourcemap: false,
        // Ensure CSS is extracted and bundled
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
    optimizeDeps: {
        include: ["react", "react-dom", "zustand"],
    },
});
