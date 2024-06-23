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
import * as glob from "glob";

export class StaticConstruct extends Construct {
  private s3Bucket: Bucket;

  constructor(scope: Construct, id: string, props?: any) {
    super(scope, id);

    this.s3Bucket = new Bucket(this, "StaticBucket", {
      websiteIndexDocument: "index.html",
      websiteErrorDocument: "index.html",
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      accessControl: BucketAccessControl.BUCKET_OWNER_FULL_CONTROL,
      publicReadAccess: true
    });
    new BucketDeployment(this, "asset-files", {
      sources: [Source.asset(__dirname + "/../../dist/client")],
      destinationBucket: this.s3Bucket,
      cacheControl: [CacheControl.noCache()]
    });

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
