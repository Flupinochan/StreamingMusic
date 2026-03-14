# Backend

## Rule

1. 作成するAWSリソースは `public readonly` でフィールに定義
2. AWSリソース名は `cdk.Stack.of(this).stackName.toLocaleLowerCase()` を利用
3. 環境変数は `env` に定義
4. stackの依存関係の際は、なるべくリソース名を渡すようにする
  - 例えばAスタックで定義したS3 BucketをBスタックで利用する場合に、作成したS3 Bucketの.Nameや.Arnを渡すとoutputsを利用することになるため、依存してしまう
  - S3 Bucketを作成する際の名前を変数として定義しておき、それを使いまわす場合は依存が発生しない。ARNも.ARNで参照するのではなく、`arn:aws:s3:::${props.bucketName}` のように動的に生成することで依存を無くせる