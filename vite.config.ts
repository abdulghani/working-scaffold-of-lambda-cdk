import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import path from "path";
import { envOnlyMacros } from "vite-env-only";

export default defineConfig({
  plugins: [
    envOnlyMacros(),
    remix({
      buildDirectory: "build",
      serverBuildFile: "index.js",
      ssr: true
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./@"),
      app: path.resolve(__dirname, "./app")
    }
  }
});
