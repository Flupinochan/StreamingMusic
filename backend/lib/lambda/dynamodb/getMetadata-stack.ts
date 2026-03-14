import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import * as path from "path";
import { DbStack } from "../../db-stack";

interface GetMetadataStackProps extends cdk.StackProps {
  dbStack: DbStack;
}

export class GetMetadataStack extends cdk.Stack {
  public readonly getMetadataFunction: lambda.Function;
  public readonly getMetadataLogGroup: logs.LogGroup;
  public readonly getMetadataRole: iam.Role;

  constructor(scope: Construct, id: string, props: GetMetadataStackProps) {
    super(scope, id, props);

    const stackName = cdk.Stack.of(this).stackName.toLocaleLowerCase();

    this.getMetadataLogGroup = new logs.LogGroup(this, "GetMetadataLogGroup", {
      logGroupName: `/aws/lambda/${stackName}-getMetadata`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.getMetadataRole = new iam.Role(this, "GetMetadataRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    const tableArn = props.dbStack.musicMetadataTable.tableArn;
    this.getMetadataRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:Scan"],
        resources: [tableArn],
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

    this.getMetadataFunction = new lambdaNodejs.NodejsFunction(
      this,
      "GetMetadataFunction",
      {
        functionName: `${stackName}-getMetadata`,
        runtime: lambda.Runtime.NODEJS_24_X,
        timeout: cdk.Duration.seconds(30),
        memorySize: 128,
        role: this.getMetadataRole,
        logGroup: this.getMetadataLogGroup,
        loggingFormat: lambda.LoggingFormat.JSON,
        handler: "index.handler",
        entry: path.join(__dirname, "getMetadata.ts"),
        environment: {
          TABLE_NAME: props.dbStack.musicMetadataTable.tableName,
        },
        layers: [powertoolsLayer],
        bundling: {
          externalModules: ["@aws-lambda-powertools/*"],
        },
      },
    );
  }
}
