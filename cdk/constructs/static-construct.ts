import { Duration, RemovalPolicy } from "aws-cdk-lib";
import { Construct } from "constructs";
import {
  BlockPublicAccess,
  Bucket,
  BucketAccessControl,
  HttpMethods,
  ObjectOwnership
} from "aws-cdk-lib/aws-s3";
import {
  BucketDeployment,
  CacheControl,
  Source
} from "aws-cdk-lib/aws-s3-deployment";
import { LambdaConstruct } from "./lambda-construct";
import * as glob from "glob";

export class StaticConstruct extends Construct {
  private s3Bucket: Bucket;

  constructor(
    scope: Construct,
    id: string,
    props: {
      lambdaConstruct: LambdaConstruct;
    }
  ) {
    super(scope, id);

    this.s3Bucket = new Bucket(this, "StaticBucket", {
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "404.html",
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      publicReadAccess: true
    });
    new BucketDeployment(this, "asset-files", {
      sources: [Source.asset(__dirname + "/../../build/client")],
      destinationBucket: this.s3Bucket,
      cacheControl: [
        CacheControl.maxAge(Duration.days(365)),
        CacheControl.sMaxAge(Duration.days(365))
      ]
    });

    props.lambdaConstruct.lambda.addEnvironment(
      "BUCKET_NAME",
      this.s3Bucket.bucketName
    );
    props.lambdaConstruct.lambda.addEnvironment(
      "KNOWN_EXTENSIONS",
      this.getKnownExtensions(__dirname + "/../../public/**/*")
    );

    this.s3Bucket.grantRead(props.lambdaConstruct.lambda);
    this.s3Bucket.grantPut(props.lambdaConstruct.lambda);
    this.s3Bucket.grantWrite(props.lambdaConstruct.lambda);
    this.s3Bucket.grantDelete(props.lambdaConstruct.lambda);

    this.s3Bucket.addCorsRule({
      allowedOrigins: ["*"],
      allowedMethods: [HttpMethods.GET, HttpMethods.HEAD]
    });
  }

  private getKnownExtensions(path: string) {
    const files = glob.globSync(path);
    return files
      .map((i: string) => i.split("/").pop()?.split(".").pop()?.trim())
      .filter((i, id, arr) => i && arr.indexOf(i) === id)
      .join(",");
  }

  public get bucket() {
    return this.s3Bucket;
  }
}
