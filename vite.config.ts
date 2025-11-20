import { defineConfig } from "vite";
import { resolve } from "node:path";

// Vite config to bundle the Lambda handler for Node.js runtime
export default defineConfig({
  build: {
    lib: {
      // Entry is your Lambda handler source
      entry: resolve(__dirname, "lambda/hello.ts"),
      name: "hello",
      formats: ["cjs"],
      // Force output file name so Lambda can find it as "hello.js"
      fileName: () => "hello.js",
    },
    // Bundled Lambda code output directory
    outDir: "dist/lambda",
    emptyOutDir: true,
    sourcemap: true,
    // Target a Node.js runtime compatible with AWS Lambda
    target: "node18",
    rollupOptions: {
      external: [
        // Add external dependencies here if you don't want them bundled
        // e.g. "aws-sdk" if you ever import it (AWS SDK v2 is available in runtime)
      ],
    },
  },
});
