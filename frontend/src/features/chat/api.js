import { api } from '@/lib/apiClient'

// Question over the whole base. The AI answer can take a while; there is no browser timeout.
export const ask = (prompt) => api('/ask', { method: 'POST', json: { prompt } })
