import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { CdkRemixStack } from "./stacks/cdk-remix-stack";
import dotenv from "dotenv";

function createStack() {
  dotenv.config();
  const app = new App();
  new CdkRemixStack(app, "CdkRemixStack", {});
}

createStack();
