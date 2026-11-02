import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '@/lib/utils'
import { askDocument } from './api'

 








const MAX_SAVED = 30
const storageKey = (documentId) => `secondmind.chat.${documentId}`

// O backend não guarda o histórico de perguntas; ele fica neste navegador.
function load(documentId) {
  try {
    const raw = localStorage.getItem(storageKey(documentId))
    return raw ? (JSON.parse(raw) ) : []
  } catch {
    return []
  }
}

export function useChat(documentId) {
  const [messages, setMessages] = useState(() => load(documentId))
  // Evita atualizar o estado depois de sair da tela.
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
      localStorage.setItem(storageKey(documentId), JSON.stringify(settled))
    } catch {
      // Sem armazenamento: o histórico vale só para esta visita.
    }
  }, [documentId, messages])

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
        const { resposta } = await askDocument(documentId, question)
        patch({ status: 'done', answer: resposta, latencyMs: Math.round(performance.now() - started) })
      } catch (error) {
        patch({ status: 'error', error: errorMessage(error) })
      }
    },
    [documentId],
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
