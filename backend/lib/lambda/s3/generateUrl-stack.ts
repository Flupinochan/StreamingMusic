import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import * as path from "path";

interface GenerateUrlStackProps extends cdk.StackProps {
  bucketName: string;
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

    // バケットARNは名前から組み立てることで HostingStack への依存を排除
    const bucketArn = `arn:aws:s3:::${props.bucketName}`;
    this.generateS3PresignedUrlRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        resources: [bucketArn, `${bucketArn}/*`],
      }),
    );

    const powertoolsLayerArn = ssm.StringParameter.valueForStringParameter(
      this,
      "/aws/service/powertools/typescript/generic/all/latest",
    );

    const powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(
      this,
      "PowertoolsLayer",
      powertoolsLayerArn,
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
        loggingFormat: lambda.LoggingFormat.JSON,
        handler: "index.handler",
        entry: path.join(__dirname, "generateUrl.ts"),
        environment: {
          BUCKET_NAME: props.bucketName,
          POWERTOOLS_LOGGER_LOG_EVENT: "true",
          TZ: "Asia/Tokyo",
        },
        layers: [powertoolsLayer],
        bundling: {
          externalModules: ["@aws-lambda-powertools/*"],
        },
      },
    );
  }
}
