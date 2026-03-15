import { RemovalPolicy } from "aws-cdk-lib";
import * as apigateway from "aws-cdk-lib/aws-apigateway";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import * as cdk from "aws-cdk-lib/core";
import { Construct } from "constructs";

interface HostingStackProps extends cdk.StackProps {
  domainName: string;
  certificateArn: string;
}

export class HostingStack extends cdk.Stack {
  public readonly bucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;
  private readonly apiGetCachePolicy: cloudfront.CachePolicy;

  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props);

    const stackName = cdk.Stack.of(this).stackName.toLocaleLowerCase();

    // CORS設定を変更する場合はbucket名を変えて再ビルドしないと安定しないため注意
    // またprodの場合はlocalhostからのCORSは許可しなくても良かったかもしれない
    this.bucket = new s3.Bucket(this, "bucket", {
      bucketName: `${stackName}-bucket`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      versioned: false,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedOrigins: [
            `https://${props.domainName}`,
            "http://localhost:5173",
          ],
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.PUT,
            s3.HttpMethods.POST,
            s3.HttpMethods.DELETE,
          ],
          allowedHeaders: ["*"],
          maxAge: 3000,
        },
      ],
    });

    const certificateArn = ssm.StringParameter.fromStringParameterAttributes(
      this,
      "CertificateArn",
      {
        parameterName: props.certificateArn,
      },
    ).stringValue;

    const certificate = acm.Certificate.fromCertificateArn(
      this,
      "Certificate",
      certificateArn,
    );

    this.distribution = new cloudfront.Distribution(this, "distribution", {
      domainNames: [props.domainName],
      certificate: certificate,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.bucket, {
          originAccessLevels: [
            cloudfront.AccessLevel.READ,
            cloudfront.AccessLevel.LIST,
          ],
        }),
        originRequestPolicy: cloudfront.OriginRequestPolicy.CORS_S3_ORIGIN,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        responseHeadersPolicy:
          cloudfront.ResponseHeadersPolicy
            .CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
      },
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_ALL,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
          ttl: cdk.Duration.minutes(0),
        },
      ],
    });

    // GETは短期間(300秒)キャッシュ
    this.apiGetCachePolicy = new cloudfront.CachePolicy(
      this,
      "ApiGetCachePolicy",
      {
        cachePolicyName: `${stackName}-api-get-cache-policy`,
        comment: "Short-lived cache for API GET and HEAD requests.",
        defaultTtl: cdk.Duration.seconds(300),
        minTtl: cdk.Duration.seconds(0),
        maxTtl: cdk.Duration.minutes(5),
        enableAcceptEncodingBrotli: true,
        enableAcceptEncodingGzip: true,
      },
    );
  }

  // API GatewayをCloudFrontのオリジンに追加するためのメソッド
  public addApiOrigin(api: apigateway.RestApi, apiPath: string) {
    const url = api.url;
    const domain = cdk.Fn.select(2, cdk.Fn.split("/", url));
    const origin = new origins.HttpOrigin(domain, {
      protocolPolicy: cloudfront.OriginProtocolPolicy.HTTPS_ONLY,
    });

    this.distribution.addBehavior(`/${apiPath}/*`, origin, {
      allowedMethods: cloudfront.AllowedMethods.ALLOW_ALL,
      cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD,
      cachePolicy: this.apiGetCachePolicy,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      originRequestPolicy:
        cloudfront.OriginRequestPolicy.ALL_VIEWER_EXCEPT_HOST_HEADER,
    });
  }
}
