import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as lambda from "aws-cdk-lib/aws-lambda";

export class LambdaCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const helloFunction = new lambda.Function(this, "HelloFunction", {
      runtime: lambda.Runtime.NODEJS_22_X,
      // Use the Vite-bundled Lambda code from dist/lambda
      code: lambda.Code.fromAsset("dist/lambda"),
      handler: "hello.handler",
      memorySize: 128,
      timeout: cdk.Duration.seconds(5),
    });

    const helloUrl = helloFunction.addFunctionUrl({
      authType: lambda.FunctionUrlAuthType.NONE,
    });

    new cdk.CfnOutput(this, "HelloFunctionUrl", {
      value: helloUrl.url,
    });
  }
}
