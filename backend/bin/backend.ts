#!/usr/bin/env node
import * as cdk from "aws-cdk-lib/core";
import { ApiStack } from "../lib/api-stack";
import { AuthStack } from "../lib/auth-stack";
import { DbStack } from "../lib/db-stack";
import {
  ProdBranchName,
  ProdDomainName,
  ProdRepoName,
  ProdSsmParamCert,
  ProdSsmParamGithub,
} from "../lib/env/prod";
import { HostingStack } from "../lib/hosting-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const baseName = "StreamingMusic";
const app = new cdk.App();

const hostingStack = new HostingStack(app, `${baseName}HostingStack`, {
  domainName: ProdDomainName,
  certificateArn: ProdSsmParamCert,
});

new PipelineStack(app, `${baseName}PipelineStack`, {
  hostingStack: hostingStack,
  githubConnectionArn: ProdSsmParamGithub,
  repoName: ProdRepoName,
  branchName: ProdBranchName,
});

const authStack = new AuthStack(app, `${baseName}AuthStack`, {
  hostingStack: hostingStack,
});

const dbStack = new DbStack(app, `${baseName}DbStack`, {});

new ApiStack(app, `${baseName}ApiStack`, {
  authStack: authStack,
  dbStack: dbStack,
});
