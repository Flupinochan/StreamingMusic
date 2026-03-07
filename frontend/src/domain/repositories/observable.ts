// zen-observableに基づいたObservableのインターフェース定義
// 本当に抽象化するならAsyncIterableなどにすべきだがしない方針
//   - 変換コストが高い
//   - Amplify/RxJS/GraphQLなど互換性の高いライブラリが多い
// RxJS: https://github.com/ReactiveX/rxjs/blob/c15b37f81ba5f5abea8c872b0189a70b150df4cb/packages/observable/src/types.ts#L181
// Amplify: https://aws-amplify.github.io/amplify-js/api/interfaces/aws_amplify.api._Reference_Types_.SubscriptionObserver.html
export interface Observer<T> {
  next(value: T): void;
  error(error: unknown): void;
  complete(): void;
}

// RxJS: https://github.com/ReactiveX/rxjs/blob/c15b37f81ba5f5abea8c872b0189a70b150df4cb/packages/observable/src/observable.ts#L49
// Amplify: https://aws-amplify.github.io/amplify-js/api/interfaces/aws_amplify.api._Reference_Types_.Subscribable.html
export interface Subscription {
  unsubscribe(): void;
}

// RxJS: https://github.com/ReactiveX/rxjs/blob/c15b37f81ba5f5abea8c872b0189a70b150df4cb/packages/observable/src/observable.ts#L551
// Amplify: https://aws-amplify.github.io/amplify-js/api/classes/aws_amplify.api._Reference_Types_.Observable.html
export interface Observable<T> {
  subscribe(observer: Partial<Observer<T>>): Subscription;
}

// 参考: https://github.com/aws-amplify/amplify-js/blob/689fd8844e33d6edb840cfb2064d17846fbda3ff/packages/datastore/docs/observables.md#L4
// zen-observable: https://github.com/zenparsing/zen-observable/blob/master/src/Observable.js
// zen-observableは過去に標準化される可能性があった仕組みで互換性が高くAmplify内部で利用しているらしい
