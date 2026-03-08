## Install

node version: v24

```bash
# 初回 (※cd不要)
npm install

# 外部ライブラリ追加時はfrontendとbackend個別にinstallが基本
## frontendに追加する場合
npm install xxx --workspace frontend
## backendに追加する場合
npm install xxx --workspace backend
```

## Generate GraphQL Schema

GraphQL更新時に必要

```bash
npm run codegen
```

## Deploy

初回デプロイ時
1. Route53へのレコード追加が必要
2. frontendのenvファイルにuserPoolやidentityPoolの設定が必要

詳しくはCodeBuildを参照

### Backend

```bash
npm run cdk --workspace=backend -- deploy --all --parallel --ci --require-approval never --context env=dev
npm run cdk --workspace=backend -- deploy --all --parallel --ci --require-approval never --context env=prod
```

### Frontend

viteのbuildの仕組みを利用し環境分離

`vite build --mode <env>`

- `.env.dev`
- `.env.prod`

```bash
npm run build --workspace=frontend -- --mode dev
npm run build --workspace=frontend -- --mode prod
```

### Local

`.env.local` ファイルを作成し、以下dev環境のdomainに接続するよう環境変数を設定してdevモードでビルド

```ini
VITE_MEDIA_HOST=https://music.metalmental.net
```

```bash
npm run dev --workspace=frontend -- --mode dev
```
