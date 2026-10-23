import { fileURLToPath } from "node:url";

import { defineConfig, type Alias } from "vite";
import react from "@vitejs/plugin-react";

const host = process.env.TAURI_DEV_HOST;

const packagesDir = fileURLToPath(new URL("../packages/", import.meta.url));

/** Resolves `@excalidraw/<name>` and its subpaths to the workspace source, like excalidraw-app. */
function sourceAlias(name: string, entry: string, dir = ""): Alias[] {
  return [
    {
      find: new RegExp(`^@excalidraw/${name}$`),
      replacement: `${packagesDir}${name}/${entry}`,
    },
    {
      find: new RegExp(`^@excalidraw/${name}/(.*)$`),
      replacement: `${packagesDir}${name}/${dir}$1`,
    },
  ];
}

// https://v2.tauri.app/start/frontend/vite/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      ...sourceAlias("excalidraw", "index.tsx"),
      ...[
        "common",
        "element",
        "math",
        "utils",
        "fractional-indexing",
        "laser-pointer",
      ].flatMap((name) => sourceAlias(name, "src/index.ts", "src/")),
    ],
  },
  clearScreen: false,
  // Desktop app: one big chunk loaded from disk is fine.
  build: { chunkSizeWarningLimit: 4096 },
  server: {
    port: 1420,
    strictPort: true,
    host: host || false,
    hmr: host ? { protocol: "ws", host, port: 1421 } : undefined,
    watch: { ignored: ["**/src-tauri/**"] },
  },
});
