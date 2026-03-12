import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as lambda from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import { AuthStack } from "./auth-stack";

interface ApiStackProps extends cdk.StackProps {
  authStack: AuthStack;
  getMetadataFunction: lambda.Function;
  postMetadataFunction: lambda.Function;
  deleteMetadataFunction: lambda.Function;
  generateUrlFunction: lambda.Function;
  deleteObjectsFunction: lambda.Function;
  processMusicFunction: lambda.Function;
  apiPath: string;
}

export class ApiStack extends cdk.Stack {
  // REST API for metadata and utilities
  public readonly metadataRestApi: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    // set up a RestApi for all operations (metadata + utilities)
    const apiLogGroup = new cdk.aws_logs.LogGroup(this, "ApiGatewayLogGroup", {
      logGroupName: `/aws/apigateway/${cdk.Stack.of(this).stackName.toLowerCase()}-api`,
      retention: cdk.aws_logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.metadataRestApi = new apigateway.RestApi(this, "MetadataRestApi", {
      restApiName: "StreamingMusicMetadataApi",
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
      },
      deployOptions: {
        stageName: props.apiPath,
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        dataTraceEnabled: true,
        accessLogDestination: new apigateway.LogGroupLogDestination(
          apiLogGroup,
        ),
        accessLogFormat: apigateway.AccessLogFormat.clf(),
        throttlingRateLimit: 10,
        throttlingBurstLimit: 10,
      },
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "MetadataAuthorizer",
      {
        cognitoUserPools: [props.authStack.userPool],
      },
    );

    // metadata resource and methods (existing)
    const musicResource =
      this.metadataRestApi.root.addResource("musicMetadata");

    // GET (no auth)
    musicResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(props.getMetadataFunction),
      { authorizationType: apigateway.AuthorizationType.NONE },
    );

    // POST (authenticated)
    musicResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(props.postMetadataFunction),
      { authorizer, authorizationType: apigateway.AuthorizationType.COGNITO },
    );

    const item = musicResource.addResource("{id}");
    item.addMethod(
      "DELETE",
      new apigateway.LambdaIntegration(props.deleteMetadataFunction),
      { authorizer, authorizationType: apigateway.AuthorizationType.COGNITO },
    );

    // utility endpoints previously exposed via AppSync
    const genResource = this.metadataRestApi.root.addResource(
      "generateS3PresignedUrl",
    );
    genResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(props.generateUrlFunction),
      { authorizer, authorizationType: apigateway.AuthorizationType.COGNITO },
    );

    const deleteFolderResource =
      this.metadataRestApi.root.addResource("deleteS3Folder");
    deleteFolderResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(props.deleteObjectsFunction),
      { authorizer, authorizationType: apigateway.AuthorizationType.COGNITO },
    );

    const processResource =
      this.metadataRestApi.root.addResource("processMusic");
    processResource.addMethod(
      "POST",
      new apigateway.LambdaIntegration(props.processMusicFunction),
      { authorizer, authorizationType: apigateway.AuthorizationType.COGNITO },
    );
  }
}
