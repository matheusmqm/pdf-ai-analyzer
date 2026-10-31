import { useSyncExternalStore } from 'react'
import { queryClient } from '@/lib/queryClient'
import { clearSession, getSession, subscribeSession } from '@/lib/session'

export function useSession() {
  return useSyncExternalStore(subscribeSession, getSession)
}

export function signOut() {
  clearSession()
  // Não deixar documentos do usuário anterior no cache.
  queryClient.clear()
}
