import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as eventsources from "aws-cdk-lib/aws-lambda-event-sources";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import * as path from "path";

interface ProcessMusicStackProps extends cdk.StackProps {
  bucketName: string;
}

export class ProcessMusicStack extends cdk.Stack {
  public readonly processMusicLogGroup: logs.LogGroup;
  public readonly processMusicRole: iam.Role;
  public readonly processMusicFunction: lambda.Function;
  public readonly processMusicQueue: sqs.Queue;
  public readonly ffmpegLayer: lambda.LayerVersion;

  constructor(scope: Construct, id: string, props: ProcessMusicStackProps) {
    super(scope, id, props);

    // layer containing ffmpeg binary
    this.ffmpegLayer = new lambda.LayerVersion(this, "FfmpegLayer", {
      code: lambda.Code.fromAsset(path.join(__dirname, "../ffmpeg-layer")),
      compatibleRuntimes: [lambda.Runtime.NODEJS_24_X],
      description: "FFmpeg binary for music processing",
    });

    const powertoolsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      "/aws/service/powertools/typescript/generic/all/latest",
    );

    const powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "PowertoolsLayer",
      powertoolsLayerArn,
    );

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

    const bucketArn = `arn:aws:s3:::${props.bucketName}`;
    this.processMusicRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        resources: [bucketArn, `${bucketArn}/*`],
      }),
    );

    const processMusicDlq = new sqs.Queue(this, "ProcessMusicDlq", {
      queueName: `${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-processmusic-dlq`,
      retentionPeriod: cdk.Duration.days(1),
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.processMusicQueue = new sqs.Queue(this, "ProcessMusicQueue", {
      queueName: `${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-processmusic-queue`,
      visibilityTimeout: cdk.Duration.minutes(15),
      retentionPeriod: cdk.Duration.days(1),
      deadLetterQueue: {
        queue: processMusicDlq,
        maxReceiveCount: 3,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.processMusicFunction = new lambdaNodejs.NodejsFunction(
      this,
      "ProcessMusicFunction",
      {
        functionName: `${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-processMusic`,
        runtime: lambda.Runtime.NODEJS_24_X,
        timeout: cdk.Duration.seconds(900),
        // 音楽ファイルをダウンロードして処理するため多めに1GiBに設定
        ephemeralStorageSize: cdk.Size.gibibytes(1),
        memorySize: 1024,
        role: this.processMusicRole,
        logGroup: this.processMusicLogGroup,
        loggingFormat: lambda.LoggingFormat.JSON,
        handler: "index.handler",
        entry: path.join(__dirname, "processMusic.ts"),
        environment: {
          BUCKET_NAME: props.bucketName,
          POWERTOOLS_LOGGER_LOG_EVENT: "true",
          TZ: "Asia/Tokyo",
        },
        layers: [this.ffmpegLayer, powertoolsLayer],
        bundling: {
          externalModules: ["@aws-lambda-powertools/*"],
        },
      },
    );

    this.processMusicFunction.addEventSource(
      new eventsources.SqsEventSource(this.processMusicQueue, {
        batchSize: 1,
      }),
    );
  }
}
