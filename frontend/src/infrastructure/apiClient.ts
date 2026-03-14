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

// POST等は認証が必要なため、これを利用してトークン取得用メソッドを設定
export function setTokenProvider(provider: TokenProvider): void {
  tokenProvider = provider
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`)
  }

  if (res.status === 204 || res.status === 205) {
    return undefined as T
  }

  const text = await res.text()
  if (text.length === 0) {
    return undefined as T
  }

  // テキストがある場合はJSONとしてパースする方針
  return JSON.parse(text) as T
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
