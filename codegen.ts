import type { CodegenConfig } from "@graphql-codegen/cli";

// GraphQL Schema自動生成
const config: CodegenConfig = {
  schema: "./backend/lib/graphql/schema.graphql",
  // documents: "./frontend/src/**/*.graphql",
  generates: {
    "./frontend/src/domain/value_objects/graphql/schema.ts": {
      plugins: ["typescript", "typescript-operations"],
      config: {
        useTypeImports: true,
        // AppSync 固有スカラーのマッピング
        scalars: {
          AWSDateTime: "string",
          AWSDate: "string",
          AWSTime: "string",
          AWSTimestamp: "number",
          AWSEmail: "string",
          AWSJSON: "string",
          AWSURL: "string",
          AWSPhone: "string",
          AWSIPAddress: "string",
          ID: "string",
        },
      },
    },
  },
};

export default config;
