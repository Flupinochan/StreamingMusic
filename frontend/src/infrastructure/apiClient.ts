import { generateClient, type GraphQLResult } from 'aws-amplify/api'

// - iam: Authorization: AWS4-HMAC-SHA256 Credential=... つまりAWS IAM Credentialsを利用した認証
//   - 割り当てられたIAM Roleに基づいてアクセス権限が決まる
// - userPool: Authorization: Bearer <JWT> つまりJWTを利用した認証
//   - IAM Roleは利用されない。サーバ側で独自にJWTを検証してアクセス権限を決める必要がある
//   - (主にAWS以外のリソースへのアクセス権限を管理したい場合)
// 認証ユーザはUserPoolで管理されているユーザに基づいてJWTが発行されるが
// GuestユーザはUserPoolで管理されていないためJWTが発行されない
// したがってGuestユーザはuserPool認証を利用できず、iam認証を利用する必要がある
// なお、認証ユーザもiam認証は可能なため、Guestユーザを扱う場合はiam認証で統一する方がシンプルになる
export type GraphqlAuthMode = 'iam' | 'userPool'

export interface GraphqlOptions {
  query: string
  variables?: Record<string, unknown>
  authMode?: GraphqlAuthMode
}

export interface ApiClient {
  graphql<T = unknown>(opts: GraphqlOptions): Promise<GraphQLResult<T>>
}

export function makeApiClient(): ApiClient {
  return generateClient({ authMode: 'iam' }) as unknown as ApiClient
}
