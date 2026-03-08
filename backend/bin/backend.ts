#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ApiStack } from "../lib/api-stack";
import { AuthStack } from "../lib/auth-stack";
import { DbStack } from "../lib/db-stack";
import { getEnvConfig } from "../lib/env";
import { HostingStack } from "../lib/hosting-stack";
import { DeleteObjectsStack } from "../lib/lambda/deleteObjects-stack";
import { GenerateUrlStack } from "../lib/lambda/generateUrl-stack";
import { ProcessMusicStack } from "../lib/lambda/processMusic-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new cdk.App();
const envName =
  (app.node.tryGetContext("env") as string) || process.env.CDK_ENV || "prod";
const cfg = getEnvConfig(envName);

const baseName = "StreamMusic";
// 後からdevを追加したため互換性のためprodにはenv名を付けていない
const suffix = cfg.name === "prod" ? "" : `-${cfg.name}`;
const prefix = `${baseName}${suffix}`;

const hostingStack = new HostingStack(app, `${prefix}HostingStack`, {
  domainName: cfg.domainName,
  certificateArn: cfg.certificateArnParam,
});

new PipelineStack(app, `${prefix}PipelineStack`, {
  hostingStack,
  githubConnectionArn: cfg.githubConnectionArnParam,
  repoName: cfg.repoName,
  branchName: cfg.branchName,
  envName: cfg.name,
});

const authStack = new AuthStack(app, `${prefix}AuthStack`, {
  hostingStack,
});

const dbStack = new DbStack(app, `${prefix}DbStack`, {});

const generateUrlStack = new GenerateUrlStack(app, `${prefix}LambdaStack`, {
  hostingStack,
});

const deleteObjectsStack = new DeleteObjectsStack(
  app,
  `${prefix}DeleteObjectsStack`,
  {
    hostingStack,
  },
);

const processMusicStack = new ProcessMusicStack(
  app,
  `${prefix}ProcessMusicStack`,
  {
    hostingStack,
  },
);

new ApiStack(app, `${prefix}ApiStack`, {
  authStack,
  lambdaStack: generateUrlStack,
  deleteObjectsStack,
  processMusicStack,
  dbStack,
});
