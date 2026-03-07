import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";
import { HostingStack } from "../hosting-stack";

interface GenerateUrlStackProps extends cdk.StackProps {
  hostingStack: HostingStack;
}

export class GenerateUrlStack extends cdk.Stack {
  public readonly generateS3PresignedUrlLogGroup: logs.LogGroup;
  public readonly generateS3PresignedUrlRole: iam.Role;
  public readonly generateS3PresignedUrlFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: GenerateUrlStackProps) {
    super(scope, id, props);

    this.generateS3PresignedUrlLogGroup = new logs.LogGroup(
      this,
      "GenerateS3PresignedUrlLogGroup",
      {
        logGroupName: `/aws/lambda/${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-generateS3PresignedUrl`,
        retention: logs.RetentionDays.ONE_DAY,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    this.generateS3PresignedUrlRole = new iam.Role(
      this,
      "GenerateS3PresignedUrlRole",
      {
        assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName(
            "service-role/AWSLambdaBasicExecutionRole",
          ),
        ],
      },
    );

    const bucketArn = props.hostingStack.bucket.bucketArn;
    this.generateS3PresignedUrlRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:PutObject", "s3:PutObjectAcl", "s3:GetObject"],
        resources: [bucketArn, `${bucketArn}/*`],
      }),
    );

    this.generateS3PresignedUrlFunction = new lambdaNodejs.NodejsFunction(
      this,
      "GenerateS3PresignedUrlFunction",
      {
        functionName: `${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-generateS3PresignedUrl`,
        runtime: lambda.Runtime.NODEJS_24_X,
        timeout: cdk.Duration.seconds(60),
        memorySize: 128,
        role: this.generateS3PresignedUrlRole,
        logGroup: this.generateS3PresignedUrlLogGroup,
        handler: "index.handler",
        entry: path.join(__dirname, "generateUrl.ts"),
        environment: {
          BUCKET_NAME: props.hostingStack.bucket.bucketName,
        },
      },
    );
  }
}
