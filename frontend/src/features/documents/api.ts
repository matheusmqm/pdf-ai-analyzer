import { api } from '@/lib/apiClient'

export type PdfDocument = {
  id: string
  filename: string
  created_at: string | null
}

export type DocumentUrl = { url: string; filename: string }

// A barra final evita o redirect 307 do FastAPI, que quebraria o CORS.
export const listDocuments = () => api<PdfDocument[]>('/documents/')

export function uploadDocument(file: File) {
  const body = new FormData()
  body.append('file', file)
  return api<PdfDocument>('/documents/upload', { method: 'POST', body })
}

export const getDocumentUrl = (id: string, inline = false) =>
  api<DocumentUrl>(`/documents/${id}/download${inline ? '?inline=true' : ''}`)

export async function downloadDocument(id: string) {
  const { url } = await getDocumentUrl(id)
  // O link já força o download (Content-Disposition), sem abrir outra aba.
  const link = document.createElement('a')
  link.href = url
  link.click()
}
