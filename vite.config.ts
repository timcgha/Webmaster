import { defineConfig } from "vite";

export default defineConfig({
  base: "/",
  build: {
    emptyOutDir: true,
    target: "es2022",
    sourcemap: false,
    manifest: true,
  },
  server: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: "127.0.0.1",
    port: 4173,
    strictPort: true,
  },
});
