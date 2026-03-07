import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";
import { HostingStack } from "../hosting-stack";

interface ProcessMusicStackProps extends cdk.StackProps {
  hostingStack: HostingStack;
}

export class ProcessMusicStack extends cdk.Stack {
  public readonly processMusicLogGroup: logs.LogGroup;
  public readonly processMusicRole: iam.Role;
  public readonly processMusicFunction: lambda.Function;
  public readonly ffmpegLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: ProcessMusicStackProps) {
    super(scope, id, props);

    // layer containing ffmpeg binary
    this.ffmpegLayer = new lambda.LayerVersion(this, "FfmpegLayer", {
      code: lambda.Code.fromAsset(path.join(__dirname, "ffmpeg-layer")),
      compatibleRuntimes: [lambda.Runtime.NODEJS_24_X],
      description: "FFmpeg binary for music processing",
    });

    this.processMusicLogGroup = new logs.LogGroup(
      this,
      "ProcessMusicLogGroup",
      {
        logGroupName: `/aws/lambda/${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-processMusic`,
        retention: logs.RetentionDays.ONE_DAY,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    this.processMusicRole = new iam.Role(this, "ProcessMusicRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    this.processMusicRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:GetObject", "s3:PutObject"],
        resources: [
          `arn:aws:s3:::${process.env.BUCKET_NAME}`,
          `arn:aws:s3:::${process.env.BUCKET_NAME}/*`,
        ],
      }),
    );

    this.processMusicFunction = new lambdaNodejs.NodejsFunction(
      this,
      "ProcessMusicFunction",
      {
        functionName: `${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-processMusic`,
        runtime: lambda.Runtime.NODEJS_24_X,
        timeout: cdk.Duration.seconds(300), // might take longer
        memorySize: 1024,
        role: this.processMusicRole,
        logGroup: this.processMusicLogGroup,
        handler: "index.handler",
        entry: path.join(__dirname, "processMusic.ts"),
        environment: {
          BUCKET_NAME: props.hostingStack.bucket.bucketName,
        },
        layers: [this.ffmpegLayer],
      },
    );
  }
}
