import { clearSession, getSession, sessionFromTokens, setSession, type Session } from './session'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

type TokenResponse = {
  access_token: string
  refresh_token: string
  expires_in: number
}

let refreshing: Promise<Session | null> | null = null

// Várias chamadas simultâneas compartilham a mesma renovação.
function refreshSession(): Promise<Session | null> {
  refreshing ??= doRefresh().finally(() => {
    refreshing = null
  })
  return refreshing
}

async function doRefresh(): Promise<Session | null> {
  const current = getSession()
  if (!current) return null

  try {
    const response = await fetch(`${BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: current.refreshToken }),
    })
    if (!response.ok) {
      // Token recusado: a sessão acabou. Falha temporária (429/5xx) mantém a sessão.
      if (response.status < 500 && response.status !== 429) clearSession()
      return null
    }
    const data: TokenResponse = await response.json()
    const session = sessionFromTokens(data.access_token, data.refresh_token, data.expires_in)
    setSession(session)
    return session
  } catch {
    return null
  }
}

async function getAccessToken(): Promise<string | null> {
  let session = getSession()
  if (!session) return null
  // Renova um pouco antes de expirar.
  if (session.expiresAt - Date.now() / 1000 < 30) session = await refreshSession()
  return session?.accessToken ?? null
}

async function readError(response: Response): Promise<string> {
  try {
    const body = await response.json()
    if (typeof body?.detail === 'string') return body.detail
    if (Array.isArray(body?.detail)) return 'Dados inválidos.'
  } catch {
    // corpo sem JSON
  }
  return `Erro inesperado (${response.status}).`
}

type RequestOptions = {
  method?: string
  json?: unknown
  body?: FormData
  /** false para rotas públicas (login). */
  auth?: boolean
}

export async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, body, auth = true } = options

  const send = (token: string | null) => {
    const headers: Record<string, string> = {}
    if (token) headers.Authorization = `Bearer ${token}`
    if (json !== undefined) headers['Content-Type'] = 'application/json'
    return fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: json !== undefined ? JSON.stringify(json) : body,
    })
  }

  let response: Response
  try {
    const token = auth ? await getAccessToken() : null
    response = await send(token)

    if (auth && response.status === 401 && token) {
      const renewed = await refreshSession()
      if (renewed) response = await send(renewed.accessToken)
    }
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.')
  }

  if (auth && (response.status === 401 || response.status === 403)) {
    clearSession()
    throw new ApiError(response.status, 'Sua sessão expirou. Entre novamente.')
  }
  if (!response.ok) throw new ApiError(response.status, await readError(response))

  return response.json()
}
