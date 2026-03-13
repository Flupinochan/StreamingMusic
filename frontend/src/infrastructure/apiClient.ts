// シンプルな REST API クライアント
// 認証トークンは外部から provider を設定できる仕組みを用意

import { getOwnUrl } from '@/presentation/utils/domain'

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

export interface ApiRequestOptions {
  method?: HttpMethod
  body?: unknown
  headers?: Record<string, string>
}

export interface ApiClient {
  request<T = unknown>(path: string, opts?: ApiRequestOptions): Promise<T>
  get<T = unknown>(path: string): Promise<T>
  post<T = unknown>(path: string, body?: unknown): Promise<T>
  delete<T = unknown>(path: string): Promise<T>
}

export type TokenProvider = () => Promise<string | undefined>

let tokenProvider: TokenProvider = async () => undefined

export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export function makeApiClient(): ApiClient {
  const baseUrl = getOwnUrl() + '/api'

  async function request<T = unknown>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
    const url = `${baseUrl}${path}`
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...opts.headers,
    }
    const token = await tokenProvider()
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(url, {
      method: opts.method ?? 'GET',
      body: opts.body != null ? JSON.stringify(opts.body) : undefined,
      headers,
    })
    return handleResponse<T>(res)
  }

  return {
    request,
    get: <T>(path: string) => request<T>(path, { method: 'GET' }),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
    delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),
  }
}
