import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/lib/utils'
import { ask as askBase } from './api'

 








const MAX_SAVED = 30
// A single conversation, over the whole base.
const STORAGE_KEY = 'secondmind.chat.base'

// The backend does not keep the question history; it stays in this browser.
function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) ) : []
  } catch {
    return []
  }
}

export function useChat() {
  const [messages, setMessages] = useState(load)
  // Avoids updating state after leaving the screen.
  const alive = useRef(true)
  const pending = messages.some((m) => m.status === 'pending')

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  useEffect(() => {
    try {
      const settled = messages.filter((m) => m.status !== 'pending').slice(-MAX_SAVED)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settled))
    } catch {
      // No storage: the history only lasts for this visit.
    }
  }, [messages])

  const ask = useCallback(
    async (question, replaceId) => {
      const id = replaceId ?? crypto.randomUUID()
      const patch = (change) => {
        if (!alive.current) return
        setMessages((current) => current.map((m) => (m.id === id ? { ...m, ...change } : m)))
      }

      const fresh = { id, question, status: 'pending' }
      setMessages((current) => (replaceId ? current.map((m) => (m.id === id ? fresh : m)) : [...current, fresh]))

      const started = performance.now()
      try {
        const { answer, sources } = await askBase(question)
        patch({ status: 'done', answer, sources: sources ?? [], latencyMs: Math.round(performance.now() - started) })
      } catch (error) {
        patch({ status: 'error', error: errorMessage(error) })
      }
    },
    [],
  )

  const clear = useCallback(() => setMessages([]), [])
  const retry = useCallback(
    (id) => {
      const message = messages.find((m) => m.id === id)
      if (message) void ask(message.question, id)
    },
    [ask, messages],
  )

  return { messages, pending, ask, clear, retry }
}
