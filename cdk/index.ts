import "source-map-support/register";
import { App } from "aws-cdk-lib";
import { CDKStaticStack } from "./stacks/cdk-static-stack";

function createStack() {
  const app = new App();
  new CDKStaticStack(app, "CDKStaticStack", {});
}

createStack();
