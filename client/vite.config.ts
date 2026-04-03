import { defineConfig } from "vite";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import electron from "vite-plugin-electron/simple";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import type { PluginOption } from "vite";

export default defineConfig(({ mode }) => {
  const isElectron = mode === "electron";
  const plugins: PluginOption[] = [
    svelte(),
    nodePolyfills({
      include: ["stream", "events", "buffer", "util"],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ];

  if (isElectron) {
    plugins.push(
      electron({
        main: {
          entry: "electron/main.ts",
        },
        preload: {
          input: "electron/preload.ts",
        },
      })
    );
  }

  return {
    plugins,
    clearScreen: false,
    server: {
      host: "0.0.0.0",
      port: 1420,
      strictPort: true,
    },
  };
});
