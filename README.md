## Install

node version: v24

npm install

## Generate GraphQL Schema

```bash
npm run codegen
```

## Deploy Backend

初回デプロイ時
1. Route53へのレコード追加が必要
2. frontendのenvファイルにuserPoolやidentityPoolの設定が必要

```bash
npm run cdk --workspace=backend -- deploy --all --parallel --ci --require-approval never --context env=dev
npm run cdk --workspace=backend -- deploy --all --parallel --ci --require-approval never --context env=prod
```
