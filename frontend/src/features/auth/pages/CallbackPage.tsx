import { LinkIcon } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { sessionFromTokens, setSession } from '@/lib/session'

// O Supabase redireciona para cá com a sessão no fragmento (#access_token=...).
// O fragmento nunca é enviado a servidores; aqui ele é lido, guardado e apagado da barra de endereço.
export default function CallbackPage() {
  const navigate = useNavigate()
  const [failed, setFailed] = useState(false)
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.hash.slice(1))
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const expiresIn = Number(params.get('expires_in')) || 3600

    // Remove os tokens da URL antes de qualquer outra coisa.
    window.history.replaceState(null, '', window.location.pathname)

    if (accessToken && refreshToken) {
      setSession(sessionFromTokens(accessToken, refreshToken, expiresIn))
      navigate('/', { replace: true })
    } else {
      setFailed(true)
    }
  }, [navigate])

  if (failed) {
    return (
      <div className="animate-rise text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-line bg-white/4 text-danger">
          <LinkIcon className="size-8" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          Link inválido ou expirado
        </h1>
        <p className="mt-3 text-muted">Peça um novo link de acesso para entrar.</p>
        <Link
          to="/login"
          className="mt-8 inline-flex h-10 items-center rounded-xl bg-linear-to-br from-accent to-[#6b4df0] px-4 text-sm font-medium text-white"
        >
          Voltar ao login
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-4 text-muted">
      <Spinner className="size-6" />
      <p>Entrando…</p>
    </div>
  )
}
