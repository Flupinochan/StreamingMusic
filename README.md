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
3. 音楽アップロード用のAdminユーザはCognitoコンソール画面から作成

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

`.env.local` ファイルを作成し、以下dev環境のdomainに接続するよう環境変数を設定して起動する

```ini
VITE_MEDIA_HOST=https://dev-music.metalmental.net
```

```bash
# devモードで起動するよう設定されています
npm run dev --workspace=frontend

# 以下で本番環境同様の動作確認が可能
npm run build --workspace=frontend -- --mode dev
npx serve frontend/dist --single --listen 5173
```

## 負債

- 次回はSSGを意識したアプリを作成する
  - 画面をリロードした際にダークモードに変化する際のちらつきが防げない
  - GitHub UIのような再レンダリングされていないように見せる方法ができない