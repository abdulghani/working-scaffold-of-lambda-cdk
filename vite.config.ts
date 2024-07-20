import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import dotenv from "dotenv";
import path from "path";
import { defineConfig } from "vite";
import { envOnlyMacros } from "vite-env-only";

// This installs globals such as "fetch", "Response", "Request" and "Headers".
installGlobals();

export default defineConfig(({ command, mode }) => {
  const isBuild = command === "build" && mode === "production";
  if (isBuild) {
    dotenv.config();
  }

  return {
    define: {
      "process.env.NODE_DEBUG": false
    },
    plugins: [
      envOnlyMacros(),
      remix({
        buildDirectory: "build",
        serverBuildFile: "index.js",
        ssr: true
      })
    ],
    base: isBuild ? process.env.VITE_S3_BASE_URL || "/" : "/",
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./@"),
        app: path.resolve(__dirname, "./app")
      }
    },
    build: {
      manifest: false,
      ssrManifest: false,
      minify: isBuild
    }
  };
});
