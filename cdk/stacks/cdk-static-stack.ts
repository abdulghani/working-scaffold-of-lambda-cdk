import { Construct } from "constructs";
import { Stack } from "aws-cdk-lib";
import { StaticConstruct } from "../constructs/static-construct";

export class CDKStaticStack extends Stack {
  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id, props);

    const staticConstruct = new StaticConstruct(this, "StaticConstruct");
  }
}
