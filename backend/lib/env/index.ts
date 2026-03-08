import { config as devConfig } from "./dev";
import { config as prodConfig } from "./prod";

export interface EnvConfig {
  name: string;
  domainName: string;
  repoName: string;
  branchName: string;
  certificateArnParam: string;
  githubConnectionArnParam: string;
}

export function getEnvConfig(env: string): EnvConfig {
  switch (env) {
    case "dev":
      return devConfig;
    case "prod":
      return prodConfig;
    default:
      throw new Error(`Unknown environment "${env}"`);
  }
}
