import { useCallback, useEffect, useState } from 'react'
import { errorMessage } from '@/lib/utils'
import { askDocument } from './api'

export type ChatMessage = {
  id: string
  question: string
  answer?: string
  error?: string
  status: 'pending' | 'done' | 'error'
}

// O backend não guarda o histórico de perguntas, então ele fica neste navegador.
const storageKey = (documentId: string) => `lumen.chat.${documentId}`

function load(documentId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(storageKey(documentId))
    return raw ? (JSON.parse(raw) as ChatMessage[]) : []
  } catch {
    return []
  }
}

export function useDocumentChat(documentId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => load(documentId))
  const pending = messages.some((message) => message.status === 'pending')

  useEffect(() => {
    try {
      // Perguntas ainda em andamento não são salvas.
      const settled = messages.filter((message) => message.status !== 'pending')
      localStorage.setItem(storageKey(documentId), JSON.stringify(settled))
    } catch {
      // Sem armazenamento: o histórico vale só para esta visita.
    }
  }, [documentId, messages])

  const ask = useCallback(
    async (question: string) => {
      const id = crypto.randomUUID()
      const update = (patch: Partial<ChatMessage>) =>
        setMessages((current) =>
          current.map((message) => (message.id === id ? { ...message, ...patch } : message)),
        )

      setMessages((current) => [...current, { id, question, status: 'pending' }])
      try {
        const { resposta } = await askDocument(documentId, question)
        update({ status: 'done', answer: resposta })
      } catch (error) {
        update({ status: 'error', error: errorMessage(error) })
      }
    },
    [documentId],
  )

  const clear = useCallback(() => setMessages([]), [])

  return { messages, pending, ask, clear }
}
