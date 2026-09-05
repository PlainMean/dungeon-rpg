import { defineConfig } from "vite";

// Vite base = project path so the static site works from GitHub Pages subpath.
// Repo is deployed to https://<org>.github.io/dungeon-rpg/
export default defineConfig({
  base: "/dungeon-rpg/",
  build: {
    target: "es2022",
    outDir: "dist",
    sourcemap: false,
    assetsInlineLimit: 0,
  },
  server: {
    host: true,
    port: 5173,
  },
});