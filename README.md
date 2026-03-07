## Install

node version: v24

npm install

## Generate GraphQL Schema

```bash
npm run codegen
```

## Deploy Backend

```bash
npm run cdk --workspace=backend -- deploy --all --parallel --ci --require-approval never
```
