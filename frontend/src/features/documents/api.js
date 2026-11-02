import { api } from '@/lib/apiClient'

 







// A barra final evita o redirect 307 do FastAPI, que quebraria o CORS.
export const listDocuments = () => api('/documents/')

export function uploadDocument(file) {
  const body = new FormData()
  body.append('file', file)
  return api('/documents/upload', { method: 'POST', body })
}

export const deleteDocument = (id) => api(`/documents/${id}`, { method: 'DELETE' })

export const getDocumentUrl = (id, inline = false) =>
  api(`/documents/${id}/download${inline ? '?inline=true' : ''}`)

export async function downloadDocument(id) {
  const { url } = await getDocumentUrl(id)
  // O link já força o download (Content-Disposition), sem abrir outra aba.
  const link = document.createElement('a')
  link.href = url
  link.click()
}
