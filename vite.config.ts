import { vitePlugin as remix } from "@remix-run/dev";
import { installGlobals } from "@remix-run/node";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { defineConfig } from "vite";
import { envOnlyMacros } from "vite-env-only";

// This installs globals such as "fetch", "Response", "Request" and "Headers".
installGlobals();

function injectManifest(options: { isBuild: boolean; base: string }) {
  const { isBuild, base } = options;
  const name = "custom-plugin";
  const filename = ".client-manifest.json";

  if (!isBuild) {
    return {
      name
    };
  }

  return {
    name,
    generateBundle(options: any, bundle: any) {
      if (options.dir.endsWith("client")) {
        const list = Object.keys(bundle).map((key) => base + key);
        fs.writeFileSync(filename, JSON.stringify(list), {
          encoding: "utf-8"
        });
      } else if (options.dir.endsWith("server")) {
        const clientmanifest = JSON.parse(
          fs.readFileSync(filename, { encoding: "utf-8" })
        );
        const indexfile = bundle["index.js"];
        if (indexfile?.code) {
          indexfile.code = `
          global.CLIENT_MANIFEST = ${JSON.stringify(clientmanifest)};
          ${indexfile.code}
          `;
        }
      }
    }
  };
}

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
