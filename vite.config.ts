import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [
    remix({
      buildDirectory: "dist",
      serverBuildFile: "index.js",
      ssr: false
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./@"),
      app: path.resolve(__dirname, "./app")
    }
  }
});
