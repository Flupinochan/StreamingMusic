import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";
import { DbStack } from "../../db-stack";

interface PostMetadataStackProps extends cdk.StackProps {
  dbStack: DbStack;
}

export class PostMetadataStack extends cdk.Stack {
  public readonly postMetadataFunction: lambda.Function;
  public readonly postMetadataLogGroup: logs.LogGroup;
  public readonly postMetadataRole: iam.Role;

  constructor(scope: Construct, id: string, props: PostMetadataStackProps) {
    super(scope, id, props);

    const stackName = cdk.Stack.of(this).stackName.toLocaleLowerCase();

    this.postMetadataLogGroup = new logs.LogGroup(
      this,
      "PostMetadataLogGroup",
      {
        logGroupName: `/aws/lambda/${stackName}-postMetadata`,
        retention: logs.RetentionDays.ONE_DAY,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    this.postMetadataRole = new iam.Role(this, "PostMetadataRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    const tableArn = props.dbStack.musicMetadataTable.tableArn;
    this.postMetadataRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:PutItem"],
        resources: [tableArn],
      }),
    );

    this.postMetadataFunction = new lambdaNodejs.NodejsFunction(
      this,
      "PostMetadataFunction",
      {
        functionName: `${stackName}-postMetadata`,
        runtime: lambda.Runtime.NODEJS_24_X,
        timeout: cdk.Duration.seconds(30),
        memorySize: 128,
        role: this.postMetadataRole,
        logGroup: this.postMetadataLogGroup,
        handler: "index.handler",
        entry: path.join(__dirname, "postMetadata.ts"),
        environment: {
          TABLE_NAME: props.dbStack.musicMetadataTable.tableName,
        },
      },
    );
  }
}
