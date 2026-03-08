import * as cdk from "aws-cdk-lib";
import * as appsync from "aws-cdk-lib/aws-appsync";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import * as path from "path";
import { AuthStack } from "./auth-stack";
import { DbStack } from "./db-stack";
import { DeleteObjectsStack } from "./lambda/deleteObjects-stack";
import { GenerateUrlStack } from "./lambda/generateUrl-stack";
import { ProcessMusicStack } from "./lambda/processMusic-stack";

interface ApiStackProps extends cdk.StackProps {
  authStack: AuthStack;
  lambdaStack: GenerateUrlStack;
  deleteObjectsStack: DeleteObjectsStack;
  processMusicStack: ProcessMusicStack;
  dbStack: DbStack;
}

export class ApiStack extends cdk.Stack {
  public readonly apiLogGroup: logs.LogGroup;
  public readonly apiLogRole: iam.Role;
  public readonly api: appsync.GraphqlApi;
  public readonly lambdaDataSource: appsync.LambdaDataSource;
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
          authorizationType: appsync.AuthorizationType.IAM,
        },
        additionalAuthorizationModes: [
          {
            authorizationType: appsync.AuthorizationType.USER_POOL,
            userPoolConfig: {
              userPool: props.authStack.userPool,
            },
          },
        ],
      },
      xrayEnabled: false,
    });

    // 認証ユーザはAPI呼び出し全権限付与
    new iam.Policy(this, "ApiAccessPolicy", {
      roles: [props.authStack.identityPool.authenticatedRole],
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["appsync:GraphQL"],
          resources: [`${this.api.arn}/*`],
        }),
      ],
    });
    // ゲストユーザは読み取りQueryとSubscriptionのみ許可
    new iam.Policy(this, "ApiAccessPolicyForGuest", {
      roles: [props.authStack.identityPool.unauthenticatedRole],
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ["appsync:GraphQL"],
          resources: [`${this.api.arn}/*`],
          conditions: {
            "ForAllValues:StringEquals": {
              "appsync:Field": [
                "listMusicMetadata",
                "onCreateMusicMetadata",
                "onUpdateMusicMetadata",
                "onRemoveMusicMetadata",
              ],
            },
          },
        }),
      ],
    });

    // ---Lambda DataSource for presigned url ---
    this.lambdaDataSource = this.api.addLambdaDataSource(
      "LambdaDataSource",
      props.lambdaStack.generateS3PresignedUrlFunction,
    );

    this.lambdaDataSource.createResolver("GenerateS3PresignedUrlResolver", {
      typeName: "Query",
      fieldName: "generateS3PresignedUrl",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // ---Lambda DataSource for delete objects ---
    const deleteDataSource = this.api.addLambdaDataSource(
      "DeleteObjectsDataSource",
      props.deleteObjectsStack.deleteObjectsFunction,
    );

    deleteDataSource.createResolver("DeleteS3FolderResolver", {
      typeName: "Mutation",
      fieldName: "deleteS3Folder",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // ---Lambda DataSource for processing music ---
    const processDataSource = this.api.addLambdaDataSource(
      "ProcessMusicDataSource",
      props.processMusicStack.processMusicFunction,
    );

    processDataSource.createResolver("ProcessMusicResolver", {
      typeName: "Mutation",
      fieldName: "processMusic",
      requestMappingTemplate: appsync.MappingTemplate.lambdaRequest(),
      responseMappingTemplate: appsync.MappingTemplate.lambdaResult(),
    });

    // --- DynamoDB DataSource ---
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
        "input.id",
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
