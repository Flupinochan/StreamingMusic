import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import * as path from "path";
import { DbStack } from "../../db-stack";

interface DeleteMetadataStackProps extends cdk.StackProps {
  dbStack: DbStack;
}

export class DeleteMetadataStack extends cdk.Stack {
  public readonly deleteMetadataFunction: lambda.Function;
  public readonly deleteMetadataLogGroup: logs.LogGroup;
  public readonly deleteMetadataRole: iam.Role;

  constructor(scope: Construct, id: string, props: DeleteMetadataStackProps) {
    super(scope, id, props);

    const stackName = cdk.Stack.of(this).stackName.toLocaleLowerCase();

    this.deleteMetadataLogGroup = new logs.LogGroup(
      this,
      "DeleteMetadataLogGroup",
      {
        logGroupName: `/aws/lambda/${stackName}-deleteMetadata`,
        retention: logs.RetentionDays.ONE_DAY,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    this.deleteMetadataRole = new iam.Role(this, "DeleteMetadataRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    const tableArn = props.dbStack.musicMetadataTable.tableArn;
    this.deleteMetadataRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["dynamodb:DeleteItem"],
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

    this.deleteMetadataFunction = new lambdaNodejs.NodejsFunction(
      this,
      "DeleteMetadataFunction",
      {
        functionName: `${stackName}-deleteMetadata`,
        runtime: lambda.Runtime.NODEJS_24_X,
        timeout: cdk.Duration.seconds(30),
        memorySize: 128,
        role: this.deleteMetadataRole,
        logGroup: this.deleteMetadataLogGroup,
        loggingFormat: lambda.LoggingFormat.JSON,
        handler: "index.handler",
        entry: path.join(__dirname, "deleteMetadata.ts"),
        environment: {
          TABLE_NAME: props.dbStack.musicMetadataTable.tableName,
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
