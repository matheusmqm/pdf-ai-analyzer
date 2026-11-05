import { api } from '@/lib/apiClient'

 







// The trailing slash avoids FastAPI's 307 redirect, which would break CORS.
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
  // The link already forces the download (Content-Disposition), without opening another tab.
  const link = document.createElement('a')
  link.href = url
  link.click()
}
