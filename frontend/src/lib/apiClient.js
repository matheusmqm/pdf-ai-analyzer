import axios from 'axios'

// Sem login: a API é de uso pessoal/local, então não há token nem sessão.
const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

export class ApiError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function readError(error) {
  // Sem resposta: servidor desligado, CORS ou rede.
  if (!error.response) return new ApiError(0, 'Não foi possível conectar ao servidor.')

  const { status, data } = error.response
  if (typeof data?.detail === 'string') return new ApiError(status, data.detail)
  if (Array.isArray(data?.detail)) return new ApiError(status, 'Dados inválidos.')
  return new ApiError(status, `Erro inesperado (${status}).`)
}

const http = axios.create({ baseURL: BASE_URL })

// Todo erro sai como ApiError, que é o que o queryClient e os componentes esperam.
http.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(readError(error)),
)

// Mesma assinatura do cliente com fetch: api(path, { method, json, body }).
// DELETE devolve 204 sem corpo; o Axios entrega data vazio e o retorno fica undefined.
export async function api(path, { method = 'GET', json, body } = {}) {
  const { data } = await http.request({ url: path, method, data: json ?? body })
  return data === '' ? undefined : data
}
