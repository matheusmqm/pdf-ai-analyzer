import { api } from '@/lib/apiClient'

export function requestLoginLink(email: string) {
  return api<{ message: string }>('/auth/otp', { method: 'POST', json: { email }, auth: false })
}
