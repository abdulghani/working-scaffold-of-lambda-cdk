import { CfnOutput, Stack } from "aws-cdk-lib";
import { HttpApi, HttpMethod } from "aws-cdk-lib/aws-apigatewayv2";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import { Construct } from "constructs";
import { LambdaConstruct } from "./lambda-construct";
import { StaticConstruct } from "./static-construct";

export class APIConstruct extends Construct {
  constructor(
    scope: Construct,
    id: string,
    props: {
      lambdaConstruct: LambdaConstruct;
      staticConstruct: StaticConstruct;
    }
  ) {
    super(scope, id);

    const httpAPI = new HttpApi(this, "api-gateway", {
      apiName: "remix-api"
    });

    const lambdaIntegration = new HttpLambdaIntegration(
      "LambdaIntegration",
      props.lambdaConstruct.lambda
    );
    httpAPI.addRoutes({
      path: "/{proxy+}",
      methods: [HttpMethod.ANY],
      integration: lambdaIntegration
    });

    const INTERNAL_API_HOST = `https://${httpAPI.httpApiId}.execute-api.${
      Stack.of(this).region
    }.${Stack.of(this).urlSuffix}`;

    new CfnOutput(this, "ApiUrl", {
      description: "The URL of the API",
      value: INTERNAL_API_HOST
    });

    props.lambdaConstruct.lambda.addEnvironment(
      "INTERNAL_API_HOST",
      INTERNAL_API_HOST
    );
  }
}
