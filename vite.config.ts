import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import path from "path";

export default defineConfig({
  plugins: [
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
