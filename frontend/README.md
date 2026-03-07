# frontend

## Deploy

```bash
npm run build --workspace=frontend
```

## アーキテクチャ

基本的なアーキテクチャは [PopCal](https://flupinochan.github.io/popcal-document/docs/architecture/core/overview) Flutterアプリと同様な構成

## フォルダ構成

```yaml
src/
├── domain/
│   ├── entities/       # ロジック
│   ├── gateways/       # DB等以外の外部API呼び出し (Interface)
│   ├── repositories/   # entityをDB等に保存し永続化 (Interface)
│   ├── services/       # 複数のentityにまたがるロジック
│   ├── value_objects/  # primitive型の代わり
├── infrastructure/
│   ├── dto/            # infrastructure側で利用するデータ型
│   ├── mappers/        # dto, entityの変換処理
│   ├── repositories/   # 実装
│   └── gateways/       # 実装
├── presentation/
│   ├── dto/            # UI側で利用するデータ型
│   ├── mappers/        # dto, entityの変換処理
│   ├── stores/         # 状態管理
│   └── view/           # UI
└── use_cases/          # repository、gateway、serviceを利用したdomain層の複合処理、UIからのdto requestをmapperでentityに変換しつつ各domain処理を呼び出す。responseもmapperでentityからdtoに変換して返却
```

## 型について

### ドメイン層で利用してよい型

- [プリミティブ型](https://typescriptbook.jp/reference/values-types-variables/primitive-types)
  - boolean
  - number
  - bigint
  - string
  - symbol
- [標準の組み込みオブジェクト](https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects)
  - Array
  - ArrayBuffer
  - Date
- [WHATWG (URL)](https://ef-carbon.github.io/url/globals.html)
  - 組み込みオブジェクトではないが、browserおよびNode.jsどちらでも利用可能なためOK

### ドメイン層で利用してはいけないbrowser or Node.js依存の型

- File (Blob)、HTMLElement、fetch: browser依存のためNG
- fs、path: Node.js依存のためNG

## 曲選択ロジック

前提
- queue: 曲のリスト
- index: 現在再生しているqueue曲リストのindex
- history: シャッフル用の再生した曲の履歴

以下のマトリクス図
- シャッフル: 有効/無効
- リピートモード: none/one/all

### 次の曲を選択するロジック

#### シャッフル無効の場合

| リピートモード | 終端でない場合 (index < queue.length - 1) | 終端の場合 (index = queue.length - 1) |
| -------------- | ----------------------------------------- | ------------------------------------- |
| none           | index + 1                                 | undefined (再生しない)                |
| one            | index                                     | index                                 |
| all            | index + 1                                 | 0 (最初の曲に戻る)                    |

---

#### シャッフル有効の場合

| リピートモード | 1曲しかない場合 (queue.length = 1) | 1曲以上ある場合 (queue.length > 1) |
| -------------- | ---------------------------------- | ---------------------------------- |
| none           | undefined (再生しない)             | ランダムにqueueから選択            |
| one            | index                              | index                              |
| all            | index                              | ランダムにqueueから選択            |


### 前の曲を選択するロジック

#### シャッフル無効の場合

| リピートモード | 先頭曲でない場合 (index > 0) | 先頭曲の場合 (index = 0)          |
| -------------- | ---------------------------- | --------------------------------- |
| none           | index - 1                    | undefined (再生しない)            |
| one            | index                        | index                             |
| all            | index - 1                    | queue.length - 1 (最後の曲に戻る) |

#### シャッフル有効の場合

| リピートモード | historyあり                 | historyなし & 先頭曲でない場合 | historyなし & 先頭曲の場合        |
| -------------- | --------------------------- | ------------------------------ | --------------------------------- |
| none           | history[history.length - 1] | index - 1                      | undefined (再生しない)            |
| one            | index                       | index                          | index                             |
| all            | history[history.length - 1] | index - 1                      | queue.length - 1 (最後の曲に戻る) |

## 抽象化について

### howler

抽象化はしない
理由としては、`外部サービスではなく`、あくまでも標準のJavaScriptのWeb Audio APIを扱いやすくしたライブラリだからである
抽象化したいのであれば、最初からhowlerを使用せず、`Web Audio APIを直接利用すべき` である
今回は、Web Audio APIの難易度が高いため、howlerを使う方針とする

### Amplify S3/DynamoDB

抽象化する
外部サービスだから


## Lighthouse

![lighthouse](./docs/lighthouse.png)

- SPAのためJSファイルが大きくなりやすいが、routerでdynamic importを使用してJSファイルを分割
- vuetifyは巨大な単一のCSSファイルを利用する
  - coreだけ利用して、colorやutilitiesのクラスは独自で必要な分だけ定義する

## 命名規則

### DTO

- xxxRequestDto/xxxInputDto: Request用
- xxxResponseDto/xxxOutput/Dto: Response用
- xxxDto: Request/Response共通用

xxxはメソッドのアクション名に合わせる

## 名前付き引数の定義

dartの名前付き引数のような機能はないため、引数を必ずInterfaceで定義することで対策する
dtoありがちなconstructorだけのclassの場合はclassにせず最初から名前付き引数になるInterfaceをdtoとして利用する
value object classはバリデーションメソッド等があるため、inferfaceにはできないが、引数をinterfaceで定義しておくことで名前付き引数にする

## S3パス構造

```
```

## AppSync型生成

AppSyncのコンソール画面を参考

```bash
# node v24に対応していないため
nvm use 20.20.1

npx @aws-amplify/cli codegen models `
--model-schema ./backend/lib/graphql/schema.graphql `
--target typescript `
--output-dir ./frontend/src/domain/value_objects/graphql
```