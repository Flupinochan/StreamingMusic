import * as cdk from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import { AuthStack } from "./auth-stack";

interface ApiStackProps extends cdk.StackProps {
  authStack: AuthStack;
  getMetadataFunction: lambda.Function;
  postMetadataFunction: lambda.Function;
  deleteMetadataFunction: lambda.Function;
  generateUrlFunction: lambda.Function;
  deleteObjectsFunction: lambda.Function;
  processMusicQueue: sqs.IQueue;
  apiPath: string;
  domainName: string;
}

export class ApiStack extends cdk.Stack {
  public readonly metadataRestApi: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, props);

    const apiLogGroup = new cdk.aws_logs.LogGroup(this, "ApiGatewayLogGroup", {
      logGroupName: `/aws/apigateway/${cdk.Stack.of(this).stackName.toLowerCase()}-api`,
      retention: cdk.aws_logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.metadataRestApi = new apigateway.RestApi(this, "MetadataRestApi", {
      restApiName: "StreamingMusicMetadataApi",
      cloudWatchRole: true,
      defaultCorsPreflightOptions: {
        allowOrigins: [`https://${props.domainName}`, "http://localhost:5173"],
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: [
          "Content-Type",
          "X-Amz-Date",
          "Authorization",
          "X-Api-Key",
          "X-Amz-Security-Token",
        ],
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

    const responseHeaders = {
      "Access-Control-Allow-Origin": "'*'",
      "Access-Control-Allow-Methods": "'*'",
      "Access-Control-Allow-Headers":
        "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'",
    };

    // 200はLambda側でCORSヘッダーを付与しているため、API Gateway側では付与しない
    // 200以外のレスポンスにはCORSヘッダーを付与する
    this.metadataRestApi.addGatewayResponse("UnauthorizedResponse", {
      type: apigateway.ResponseType.UNAUTHORIZED,
      responseHeaders,
    });

    this.metadataRestApi.addGatewayResponse("AccessDeniedResponse", {
      type: apigateway.ResponseType.ACCESS_DENIED,
      responseHeaders,
    });

    this.metadataRestApi.addGatewayResponse("Default4xxResponse", {
      type: apigateway.ResponseType.DEFAULT_4XX,
      responseHeaders,
    });

    this.metadataRestApi.addGatewayResponse("Default5xxResponse", {
      type: apigateway.ResponseType.DEFAULT_5XX,
      responseHeaders,
    });

    const authorizer = new apigateway.CognitoUserPoolsAuthorizer(
      this,
      "MetadataAuthorizer",
      {
        cognitoUserPools: [props.authStack.userPool],
      },
    );

    // Dynamodb music metadata API
    const musicResource =
      this.metadataRestApi.root.addResource("musicMetadata");

    /// GET (no auth)
    musicResource.addMethod(
      "GET",
      new apigateway.LambdaIntegration(props.getMetadataFunction),
      { authorizationType: apigateway.AuthorizationType.NONE },
    );

    /// POST (authenticated)
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

    // S3 API (authenticated)
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

    // SQSを利用するため、API Gateway側でModelを利用してValidationを実施
    const processResource =
      this.metadataRestApi.root.addResource("processMusic");

    const processMusicRequestModel = this.metadataRestApi.addModel(
      "ProcessMusicRequestModel",
      {
        contentType: "application/json",
        schema: {
          type: apigateway.JsonSchemaType.OBJECT,
          properties: {
            key: { type: apigateway.JsonSchemaType.STRING },
          },
          required: ["key"],
        },
      },
    );

    const processMusicRequestValidator = new apigateway.RequestValidator(
      this,
      "ProcessMusicRequestValidator",
      {
        restApi: this.metadataRestApi,
        validateRequestBody: true,
      },
    );

    const apiGatewaySqsRole = new iam.Role(this, "ApiGatewaySqsRole", {
      assumedBy: new iam.ServicePrincipal("apigateway.amazonaws.com"),
    });

    props.processMusicQueue.grantSendMessages(apiGatewaySqsRole);

    const sqsIntegration = new apigateway.AwsIntegration({
      service: "sqs",
      integrationHttpMethod: "POST",
      path: `${cdk.Aws.ACCOUNT_ID}/${props.processMusicQueue.queueName}`,
      options: {
        credentialsRole: apiGatewaySqsRole,
        requestTemplates: {
          "application/json":
            "Action=SendMessage&MessageBody=$util.urlEncode($input.body)",
        },
        requestParameters: {
          "integration.request.header.Content-Type":
            "'application/x-www-form-urlencoded'",
        },
        integrationResponses: [
          {
            statusCode: "202",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'POST,OPTIONS'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            },
            responseTemplates: {
              "application/json": JSON.stringify({ message: "accepted" }),
            },
          },
          {
            selectionPattern: "4\\d{2}",
            statusCode: "400",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'POST,OPTIONS'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            },
            responseTemplates: {
              "application/json": JSON.stringify({ message: "bad request" }),
            },
          },
          {
            selectionPattern: "5\\d{2}",
            statusCode: "500",
            responseParameters: {
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods":
                "'POST,OPTIONS'",
              "method.response.header.Access-Control-Allow-Headers":
                "'Content-Type,Authorization,X-Amz-Date,X-Api-Key,X-Amz-Security-Token'",
            },
            responseTemplates: {
              "application/json": JSON.stringify({
                message: "internal server error",
              }),
            },
          },
        ],
      },
    });

    processResource.addMethod("POST", sqsIntegration, {
      authorizer,
      authorizationType: apigateway.AuthorizationType.COGNITO,
      requestValidator: processMusicRequestValidator,
      requestModels: {
        "application/json": processMusicRequestModel,
      },
      methodResponses: [
        {
          statusCode: "202",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Methods": true,
            "method.response.header.Access-Control-Allow-Headers": true,
          },
        },
        {
          statusCode: "400",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Methods": true,
            "method.response.header.Access-Control-Allow-Headers": true,
          },
        },
        {
          statusCode: "500",
          responseParameters: {
            "method.response.header.Access-Control-Allow-Origin": true,
            "method.response.header.Access-Control-Allow-Methods": true,
            "method.response.header.Access-Control-Allow-Headers": true,
          },
        },
      ],
    });
  }
}
