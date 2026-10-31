import { api } from '@/lib/apiClient'

// A resposta da IA pode demorar; não há timeout no navegador.
export const askDocument = (documentId: string, prompt: string) =>
  api<{ resposta: string }>('/documents/ask', {
    method: 'POST',
    json: { document_id: documentId, prompt },
  })
