#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ApiStack } from "../lib/api-stack";
import { AuthStack } from "../lib/auth-stack";
import { DbStack } from "../lib/db-stack";
import { getEnvConfig } from "../lib/env";
import { HostingStack } from "../lib/hosting-stack";
import { DeleteMetadataStack } from "../lib/lambda/dynamodb/deleteMetadata-stack";
import { GetMetadataStack } from "../lib/lambda/dynamodb/getMetadata-stack";
import { PostMetadataStack } from "../lib/lambda/dynamodb/postMetadata-stack";
import { DeleteObjectsStack } from "../lib/lambda/s3/deleteObjects-stack";
import { GenerateUrlStack } from "../lib/lambda/s3/generateUrl-stack";
import { ProcessMusicStack } from "../lib/lambda/s3/processMusic-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();
const envName =
  (app.node.tryGetContext("env") as string) || process.env.CDK_ENV || "dev";
const cfg = getEnvConfig(envName);

const baseName = "StreamMusic";
const apiPath = "api";

// 後からdevを追加したため互換性のためprodにはenv名を付けていない
const suffix = cfg.name === "prod" ? "" : `-${cfg.name}`;
const prefix = `${baseName}${suffix}`;

const hostingStack = new HostingStack(app, `${prefix}HostingStack`, {
  domainName: cfg.domainName,
  certificateArn: cfg.certificateArnParam,
});

const hostingStackNameLower = `${prefix}HostingStack`.toLowerCase();
const bucketName = `${hostingStackNameLower}-bucket`;

const authStack = new AuthStack(app, `${prefix}AuthStack`, {
  bucketName,
});

const dbStack = new DbStack(app, `${prefix}DbStack`, {});

const generateUrlStack = new GenerateUrlStack(app, `${prefix}LambdaStack`, {
  bucketName,
});

const deleteObjectsStack = new DeleteObjectsStack(
  app,
  `${prefix}DeleteObjectsStack`,
  {
    bucketName,
  },
);

const processMusicStack = new ProcessMusicStack(
  app,
  `${prefix}ProcessMusicStack`,
  {
    bucketName,
  },
);

const getMetadataStack = new GetMetadataStack(
  app,
  `${prefix}GetMetadataStack`,
  {
    dbStack,
  },
);

const postMetadataStack = new PostMetadataStack(
  app,
  `${prefix}PostMetadataStack`,
  {
    dbStack,
  },
);

const deleteMetadataStack = new DeleteMetadataStack(
  app,
  `${prefix}DeleteMetadataStack`,
  {
    dbStack,
  },
);

const apiStack = new ApiStack(app, `${prefix}ApiStack`, {
  authStack,
  getMetadataFunction: getMetadataStack.getMetadataFunction,
  postMetadataFunction: postMetadataStack.postMetadataFunction,
  deleteMetadataFunction: deleteMetadataStack.deleteMetadataFunction,
  generateUrlFunction: generateUrlStack.generateS3PresignedUrlFunction,
  deleteObjectsFunction: deleteObjectsStack.deleteObjectsFunction,
  processMusicFunction: processMusicStack.processMusicFunction,
  apiPath,
  domainName: cfg.domainName,
});

// register API as an origin on CloudFront
hostingStack.addApiOrigin(apiStack.metadataRestApi, apiPath);

new PipelineStack(app, `${prefix}PipelineStack`, {
  hostingStack,
  githubConnectionArn: cfg.githubConnectionArnParam,
  repoName: cfg.repoName,
  branchName: cfg.branchName,
  envName: cfg.name,
});
