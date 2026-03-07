import * as cdk from "aws-cdk-lib";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import { Construct } from "constructs";

export class DbStack extends cdk.Stack {
  public readonly musicMetadataTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    const stackName = cdk.Stack.of(this).stackName.toLocaleLowerCase();

    this.musicMetadataTable = new dynamodb.Table(this, "MusicMetadata", {
      tableName: `${stackName}-music-metadata`,
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      tableClass: dynamodb.TableClass.STANDARD,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });
  }
}
