import axios from 'axios'

// No login: the API is for personal/local use, so there is no token or session.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function readError(error) {
  // No response: server down, CORS or network.
  if (!error.response) return new ApiError(0, 'Could not connect to the server.')

  const { status, data } = error.response
  if (typeof data?.detail === 'string') return new ApiError(status, data.detail)
  if (Array.isArray(data?.detail)) return new ApiError(status, 'Invalid data.')
  return new ApiError(status, `Unexpected error (${status}).`)
}

const http = axios.create({ baseURL: BASE_URL })

// Every error comes out as an ApiError, which is what queryClient and the components expect.
http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(readError(error)),
)

// Same signature as the fetch-based client: api(path, { method, json, body }).
// DELETE returns 204 with no body; Axios gives empty data and the result is undefined.
export async function api(path, { method = 'GET', json, body } = {}) {
  const { data } = await http.request({ url: path, method, data: json ?? body })
  return data === '' ? undefined : data
}
