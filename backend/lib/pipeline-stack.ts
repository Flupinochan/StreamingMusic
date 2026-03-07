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
}

export class PipelineStack extends cdk.Stack {
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

    const codeBuildLogGroup = new logs.LogGroup(this, "CodeBuildLogGroup", {
      logGroupName: `/aws/codebuild/${stackName}-codebuild`,
      retention: logs.RetentionDays.ONE_DAY,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    const artifactBucket = new s3.Bucket(this, "ArtifactBucket", {
      bucketName: `${stackName}-artifact-bucket`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          expiration: cdk.Duration.days(1),
        },
      ],
    });

    const buildProject = new codebuild.PipelineProject(this, "BuildProject", {
      projectName: `${stackName}-build-project`,
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true,
      },
      logging: {
        cloudWatch: {
          logGroup: codeBuildLogGroup,
        },
      },
      buildSpec: codebuild.BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            "runtime-versions": {
              nodejs: "22",
            },
            commands: ["node -v", "npm ci --workspace=frontend"],
          },
          build: {
            commands: ["npm run build --workspace=frontend"],
          },
          post_build: {
            commands: [
              `aws s3 sync frontend/dist/ s3://${props.hostingStack.bucket.bucketName}/ --delete`,
              `aws cloudfront create-invalidation --distribution-id ${props.hostingStack.distribution.distributionId} --paths "/*"`,
            ],
          },
        },
      }),
    });

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["s3:*"],
        resources: [
          props.hostingStack.bucket.bucketArn,
          `${props.hostingStack.bucket.bucketArn}/*`,
        ],
      }),
    );

    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ["cloudfront:CreateInvalidation"],
        resources: [
          `arn:aws:cloudfront::${this.account}:distribution/${props.hostingStack.distribution.distributionId}`,
        ],
      }),
    );

    const pipeline = new codepipeline.Pipeline(this, "Pipeline", {
      pipelineName: `${stackName}-pipeline`,
      artifactBucket: artifactBucket,
      crossAccountKeys: false,
    });

    const sourceOutput = new codepipeline.Artifact("SourceOutput");
    pipeline.addStage({
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

    pipeline.addStage({
      stageName: "Build",
      actions: [
        new codepipeline_actions.CodeBuildAction({
          actionName: "Build_And_Deploy",
          project: buildProject,
          input: sourceOutput,
          outputs: [new codepipeline.Artifact("BuildOutput")],
        }),
      ],
    });
  }
}
