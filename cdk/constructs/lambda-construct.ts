import { Duration } from "aws-cdk-lib";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import { ICommandHooks, NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import fs from "fs";

export class LambdaConstruct extends Construct {
  private lambdaFunction: NodejsFunction;

  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id);

    this.lambdaFunction = new NodejsFunction(this, "LambdaFunction", {
      entry: __dirname + "/../../handler.ts",
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      memorySize: 768,
      timeout: Duration.minutes(2),
      bundling: {
        minify: true,
        sourceMap: false,
        keepNames: true,
        bundleAwsSDK: false,
        nodeModules: this.readServerImports(),
        commandHooks: this.createHooks({
          afterBundling(inputDir: string, outputDir: string) {
            /** INSTALL SHARP FOR ARM */
            return ["npm install --os=linux --cpu=arm64 sharp"];
          }
        })
      },
      environment: {
        COOKIE_SECRET: process.env.COOKIE_SECRET || "",
        DB_HOST: process.env.DB_HOST || "",
        DB_PORT: process.env.DB_PORT || "",
        DB_USER: process.env.DB_USER || "",
        DB_PASSWORD: process.env.DB_PASSWORD || "",
        DB_NAME: process.env.DB_NAME || "",
        SMTP_HOST: process.env.SMTP_HOST || "",
        SMTP_PORT: process.env.SMTP_PORT || "",
        SMTP_USER: process.env.SMTP_USER || "",
        SMTP_PASSWORD: process.env.SMTP_PASSWORD || "",
        TZ: process.env.TZ || "",
        NODE_ENV: process.env.NODE_ENV || "production",
        S3_IMAGE_BUCKET: process.env.S3_IMAGE_BUCKET || "",
        VAPID_PRIVATE_KEY: process.env.VAPID_PRIVATE_KEY || "",
        VAPID_PUBLIC_KEY: process.env.VAPID_PUBLIC_KEY || ""
      }
    });
  }

  private readServerImports() {
    const included = [
      "pg",
      "react",
      "react-dom",
      "@remix-run/node",
      "@remix-run/react",
      "luxon"
    ];
    const excluded = [
      "node:stream",
      "react",
      "react-dom",
      "@radix-ui",
      "clsx",
      "tailwind-merge",
      "lucide-react",
      "class-variance-authority",
      "lodash-es" /** BUILD LODASH WITH ESBUILD TREESHAKE */,
      "sharp" /** SHARP INSTALLED MANUALLY */
    ];
    const file = fs.readFileSync(
      __dirname + "/../../build/server/index.js",
      "utf-8"
    );
    const split = file.split("\n");
    const imports = split
      .filter((line) => line.includes("import") && line.includes("from"))
      .map((line) =>
        line.replace(/.+from(\s)?(")?/i, "").replace(/(")?(;)?$/i, "")
      )
      .filter(
        (i) =>
          !excluded.find((k) => i.startsWith(k)) &&
          !included.find((k) => i.startsWith(k))
      );

    return [...imports, ...included];
  }

  private createHooks(hooks: Partial<ICommandHooks>) {
    return {
      beforeBundling: hooks.beforeBundling || (() => []),
      beforeInstall: hooks.beforeInstall || (() => []),
      afterBundling: hooks.afterBundling || (() => [])
    };
  }

  public get lambda() {
    return this.lambdaFunction;
  }
}
