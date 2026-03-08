import * as cdk from "aws-cdk-lib";
import * as codebuild from "aws-cdk-lib/aws-codebuild";
import * as codepipeline from "aws-cdk-lib/aws-codepipeline";
import * as codepipeline_actions from "aws-cdk-lib/aws-codepipeline-actions";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as ssm from "aws-cdk-lib/aws-ssm";
import { Construct } from "constructs";
import { HostingStack } from "./hosting-stack";

interface PipelineStackProps extends cdk.StackProps {
  hostingStack: HostingStack;
  githubConnectionArn: string;
  repoName: string;
  branchName: string;
  envName: string;
}

export class PipelineStack extends cdk.Stack {
  public readonly codeBuildLogGroup: logs.LogGroup;
  public readonly artifactBucket: s3.Bucket;
  public readonly codebuild: codebuild.PipelineProject;
  public readonly pipeline: codepipeline.Pipeline;

  constructor(scope: Construct, id: string, props: PipelineStackProps) {
    super(scope, id, props);

    const stackName = cdk.Stack.of(this).stackName.toLocaleLowerCase();

    const connectionArn = ssm.StringParameter.fromStringParameterAttributes(
      this,
      "GitHubConnectionArn",
      {
        parameterName: props.githubConnectionArn,
      },
    ).stringValue;

    this.codeBuildLogGroup = new logs.LogGroup(this, "CodeBuildLogGroup", {
      logGroupName: `/aws/codebuild/${stackName}-codebuild`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.artifactBucket = new s3.Bucket(this, "ArtifactBucket", {
      bucketName: `${stackName}-artifact-bucket`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(1),
        },
      ],
    });

    this.codebuild = new codebuild.PipelineProject(this, "BuildProject", {
      projectName: `${stackName}-build-project`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      logging: {
        cloudWatch: {
          logGroup: this.codeBuildLogGroup,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": {
              nodejs: "24",
            },
            commands: [
              "node -v",
              "npm ci",
              // prepare ffmpeg layer binary (download from release)
              "mkdir -p backend/lib/lambda/ffmpeg-layer/bin",
              "curl -L -o ffmpeg.tar.xz https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-gpl.tar.xz",
              "tar -xJf ffmpeg.tar.xz -C backend/lib/lambda/ffmpeg-layer/bin --strip-components=2 --wildcards '*bin/ffmpeg'",
              "chmod +x backend/lib/lambda/ffmpeg-layer/bin/ffmpeg",
            ],
          },
          pre_build: {
            commands: [
              `npm run cdk --workspace=backend -- deploy --all --parallel --ci --require-approval never --context env=${props.envName}`,
            ],
          },
          build: {
            commands: [
              `npm run build --workspace=frontend -- --mode ${props.envName}`,
            ],
          },
          post_build: {
            commands: [
              // sync everything first, but skip music directory
              `aws s3 sync frontend/dist/ s3://${props.hostingStack.bucket.bucketName}/ --delete --exclude "music/*"`,

              // re‑upload asset files with long cache headers
              `aws s3 cp frontend/dist/ s3://${props.hostingStack.bucket.bucketName}/ --recursive \
                --exclude "*" \
                --include "*.js" --include "*.css" --include "*.png" \
                --include "*.jpg" --include "*.jpeg" --include "*.gif" \
                --include "*.webp" --include "*.svg" --include "*.woff2" \
                --include "*.ico" \
                --cache-control "public, max-age=31536000, immutable"`,
              // index.html with no-cache policy
              `aws s3 cp frontend/dist/index.html s3://${props.hostingStack.bucket.bucketName}/index.html \
                --cache-control "public, max-age=0, must-revalidate"`,
              // finally invalidate CloudFront
              `aws cloudfront create-invalidation --distribution-id ${props.hostingStack.distribution.distributionId} --paths "/*"`,
            ],
          },
        },
      }),
    });

    this.codebuild.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["s3:*"],
        resources: [
          props.hostingStack.bucket.bucketArn,
          `${props.hostingStack.bucket.bucketArn}/*`,
        ],
      }),
    );

    this.codebuild.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["cloudfront:CreateInvalidation"],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${props.hostingStack.distribution.distributionId}`,
        ],
      }),
    );

    this.codebuild.addToRolePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: ["*"],
        conditions: {
          "ForAnyValue:StringEquals": {
            "iam:ResourceTag/aws-cdk:bootstrap-role": [
              "image-publishing",
              "file-publishing",
              "deploy",
              "lookup",
            ],
          },
        },
      }),
    );

    this.pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: `${stackName}-pipeline`,
      artifactBucket: this.artifactBucket,
      crossAccountKeys: false,
    });

    const sourceOutput = new codepipeline.Artifact("SourceOutput");
    this.pipeline.addStage({
      stageName: "Source",
      actions: [
        new codepipeline_actions.CodeStarConnectionsSourceAction({
          actionName: "GitHub_Source",
          connectionArn: connectionArn,
          owner: "Flupinochan",
          repo: props.repoName,
          branch: props.branchName,
          output: sourceOutput,
        }),
      ],
    });

    this.pipeline.addStage({
      stageName: "Build",
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: "Build_And_Deploy",
          project: this.codebuild,
          input: sourceOutput,
          outputs: [new codepipeline.Artifact("BuildOutput")],
        }),
      ],
    });
  }
}
