import * as cdk from "aws-cdk-lib";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";

interface DeleteObjectsStackProps extends cdk.StackProps {
  bucketName: string;
}

export class DeleteObjectsStack extends cdk.Stack {
  public readonly deleteObjectsLogGroup: logs.LogGroup;
  public readonly deleteObjectsRole: iam.Role;
  public readonly deleteObjectsFunction: lambda.Function;

  constructor(scope: Construct, id: string, props: DeleteObjectsStackProps) {
    super(scope, id, props);

    this.deleteObjectsLogGroup = new logs.LogGroup(
      this,
      "DeleteObjectsLogGroup",
      {
        logGroupName: `/aws/lambda/${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-deleteObjects`,
        retention: logs.RetentionDays.ONE_DAY,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
      },
    );

    this.deleteObjectsRole = new iam.Role(this, "DeleteObjectsRole", {
      assumedBy: new iam.ServicePrincipal("lambda.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "service-role/AWSLambdaBasicExecutionRole",
        ),
      ],
    });

    const bucketArn = `arn:aws:s3:::${props.bucketName}`;
    this.deleteObjectsRole.addToPolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        resources: [bucketArn, `${bucketArn}/*`],
      }),
    );

    this.deleteObjectsFunction = new lambdaNodejs.NodejsFunction(
      this,
      "DeleteObjectsFunction",
      {
        functionName: `${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-deleteObjects`,
        runtime: lambda.Runtime.NODEJS_24_X,
        timeout: cdk.Duration.seconds(60),
        memorySize: 128,
        role: this.deleteObjectsRole,
        logGroup: this.deleteObjectsLogGroup,
        handler: "index.handler",
        entry: path.join(__dirname, "deleteObjects.ts"),
        environment: {
          BUCKET_NAME: props.bucketName,
        },
      },
    );
  }
}
