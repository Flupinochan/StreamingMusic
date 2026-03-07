import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";
import { AuthStack } from "./auth-stack";
import { DbStack } from "./db-stack";

interface ApiStackProps extends cdk.StackProps {
  authStack: AuthStack;
  dbStack: DbStack;
}

export class ApiStack extends cdk.Stack {
  public readonly apiLogGroup: logs.LogGroup;
  public readonly apiLogRole: iam.Role;
  public readonly api: appsync.GraphqlApi;
  public readonly datasource: appsync.DynamoDbDataSource;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    this.apiLogGroup = new logs.LogGroup(this, "ApiLogGroup", {
      logGroupName: `/aws/appsync/apis/${cdk.Stack.of(this).stackName.toLocaleLowerCase()}-api`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.apiLogRole = new iam.Role(this, "ApiLogRole", {
      assumedBy: new iam.ServicePrincipal("appsync.amazonaws.com"),
    });

    this.apiLogRole.addToPolicy(
      new iam.PolicyStatement({
        actions: [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ],
        resources: [
          this.apiLogGroup.logGroupArn,
          `${this.apiLogGroup.logGroupArn}:*`,
        ],
      }),
    );

    this.api = new appsync.GraphqlApi(this, "Api", {
      name: "StreamingMusicApi",
      definition: appsync.Definition.fromFile(
        path.join(__dirname, "graphql", "schema.graphql"),
      ),
      queryDepthLimit: 10,
      visibility: appsync.Visibility.GLOBAL,
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.INFO,
        retention: logs.RetentionDays.ONE_DAY,
        role: this.apiLogRole,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.USER_POOL,
          userPoolConfig: {
            userPool: props.authStack.userPool,
          },
        },
      },
      xrayEnabled: false,
    });

    new iam.Policy(this, "ApiAccessPolicy", {
      roles: [props.authStack.identityPool.authenticatedRole],
      statements: [
        new iam.PolicyStatement({
          actions: ["appsync:GraphQL"],
          resources: [`${this.api.arn}/*`],
        }),
      ],
    });

    this.datasource = this.api.addDynamoDbDataSource(
      "DynamoDbDataSource",
      props.dbStack.musicMetadataTable,
      {
        name: "DynamoDbDataSource",
      },
    );

    // --- create ---
    this.datasource.createResolver("CreateMusicMetadataResolver", {
      typeName: "Mutation",
      fieldName: "createMusicMetadata",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        // appsync.PrimaryKey.partition("id").auto(),
        appsync.PrimaryKey.partition("id").is("input.id"),
        appsync.Values.projecting("input"),
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // --- update ---
    this.datasource.createResolver("UpdateMusicMetadataResolver", {
      typeName: "Mutation",
      fieldName: "updateMusicMetadata",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition("id").is("input.id"),
        appsync.Values.projecting("input"),
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // --- remove ---
    this.datasource.createResolver("RemoveMusicMetadataResolver", {
      typeName: "Mutation",
      fieldName: "removeMusicMetadata",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbDeleteItem(
        "id",
        "id",
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });

    // --- list ---
    this.datasource.createResolver("ListMusicMetadataResolver", {
      typeName: "Query",
      fieldName: "listMusicMetadata",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbScanTable(),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultList(),
    });
  }
}
