import { vitePlugin as remix } from "@remix-run/dev";
import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "vite";
import { envOnlyMacros } from "vite-env-only";

export default defineConfig(({ command, mode }) => {
  const isBuild = command === "build" && mode === "production";
  if (isBuild) {
    dotenv.config();
  }

  return {
    plugins: [
      envOnlyMacros(),
      remix({
        buildDirectory: "build",
        serverBuildFile: "index.js",
        ssr: true
      })
    ],
    define: {
      "process.env.NODE_DEBUG": false
    },
    base: isBuild ? process.env.VITE_S3_BASE_URL || "/" : "/",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./@"),
        app: path.resolve(__dirname, "./app")
      }
    }
  };
});
