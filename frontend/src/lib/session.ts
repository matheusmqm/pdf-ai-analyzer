// Sessão guardada no localStorage. O evento `storage` avisa as outras abas,
// então a aba do login entra sozinha quando o link do e-mail é aberto em outra.
export type Session = {
  accessToken: string
  refreshToken: string
  /** Epoch em segundos. */
  expiresAt: number
}

const KEY = 'lumen.session'
const listeners = new Set<() => void>()

let lastRaw: string | null | undefined
let lastSession: Session | null = null

function parse(raw: string | null): Session | null {
  if (!raw) return null
  try {
    const value = JSON.parse(raw)
    return value?.accessToken && value?.refreshToken ? value : null
  } catch {
    return null
  }
}

function readRaw(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

// Precisa devolver a mesma referência enquanto nada mudou (useSyncExternalStore).
export function getSession(): Session | null {
  const raw = readRaw()
  if (raw !== lastRaw) {
    lastRaw = raw
    lastSession = parse(raw)
  }
  return lastSession
}

function notify() {
  listeners.forEach((listener) => listener())
}

export function setSession(session: Session) {
  try {
    localStorage.setItem(KEY, JSON.stringify(session))
  } catch {
    // Sem armazenamento disponível: a sessão não persiste.
  }
  notify()
}

export function clearSession() {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // ignorado
  }
  notify()
}

export function subscribeSession(listener: () => void) {
  listeners.add(listener)
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener()
  }
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(listener)
    window.removeEventListener('storage', onStorage)
  }
}

export function sessionFromTokens(
  accessToken: string,
  refreshToken: string,
  expiresInSeconds: number,
): Session {
  return {
    accessToken,
    refreshToken,
    expiresAt: Math.floor(Date.now() / 1000) + expiresInSeconds,
  }
}
