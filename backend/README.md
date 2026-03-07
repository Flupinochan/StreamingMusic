# Backend

## Deploy

```bash
npm run cdk --workspace=backend -- deploy --all --parallel --ci --require-approval never
```

## Rule

1. 作成するAWSリソースは `public readonly` でフィールに定義
2. AWSリソース名は `cdk.Stack.of(this).stackName.toLocaleLowerCase()` を利用
3. 環境変数は `env` に定義
