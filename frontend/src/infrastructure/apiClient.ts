import { generateClient, type GraphQLResult } from 'aws-amplify/api'

export type GraphqlAuthMode = 'userPool'

export interface GraphqlOptions {
  query: string
  variables?: Record<string, unknown>
  authMode?: GraphqlAuthMode
}

export interface ApiClient {
  graphql<T = unknown>(opts: GraphqlOptions): Promise<GraphQLResult<T>>
}

export function makeApiClient(): ApiClient {
  return generateClient() as unknown as ApiClient
}
