import { Duration } from "aws-cdk-lib";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { Construct } from "constructs";
import { Architecture, Runtime } from "aws-cdk-lib/aws-lambda";
import fs from "fs";

export class LambdaConstruct extends Construct {
  private lambdaFunction: NodejsFunction;
  private static EXCLUDED_IMPORTS = ["node:stream"];

  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id);

    this.lambdaFunction = new NodejsFunction(this, "LambdaFunction", {
      entry: __dirname + "/../../handler.ts",
      runtime: Runtime.NODEJS_20_X,
      architecture: Architecture.ARM_64,
      awsSdkConnectionReuse: true,
      timeout: Duration.seconds(20),
      bundling: {
        minify: true,
        sourceMap: false,
        keepNames: true,
        bundleAwsSDK: false,
        nodeModules: ["@remix-run/node", "@remix-run/react", "react"]
      }
    });
  }

  private readServerImports() {
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
          !i.startsWith("react") &&
          !i.startsWith("react-dom") &&
          !i.startsWith("@remix-run/architect") &&
          !i.startsWith("@radix-ui") &&
          !i.startsWith("class-variance-authority") &&
          !i.startsWith("clsx") &&
          !i.startsWith("tailwind-merge") &&
          !i.startsWith("qrcode") &&
          !i.startsWith("isbot") &&
          !LambdaConstruct.EXCLUDED_IMPORTS.includes(i)
      );

    return [...imports, "react", "react-dom", "@remix-run/architect"];
  }

  public get lambda() {
    return this.lambdaFunction;
  }
}
