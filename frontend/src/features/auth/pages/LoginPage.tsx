import { useMutation } from '@tanstack/react-query'
import { ArrowRight, MailCheck } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Navigate } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/Alert'
import { errorMessage } from '@/lib/utils'
import { requestLoginLink } from '../api'
import { useSession } from '../useSession'

const RESEND_SECONDS = 30

export default function LoginPage() {
  const session = useSession()
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const send = useMutation({
    mutationFn: requestLoginLink,
    onSuccess: (_, sentEmail) => {
      setSentTo(sentEmail)
      setCooldown(RESEND_SECONDS)
    },
  })

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((value) => value - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  // Abrir o link do e-mail em outra aba grava a sessão e esta aba entra sozinha.
  if (session) return <Navigate to="/" replace />

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    send.mutate(email.trim())
  }

  if (sentTo) {
    return (
      <div className="animate-rise text-center">
        <div className="mx-auto mb-6 grid size-16 place-items-center rounded-2xl border border-line bg-white/4 text-mint">
          <MailCheck className="size-8" />
        </div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Verifique seu e-mail</h1>
        <p className="mx-auto mt-3 max-w-sm text-balance text-muted">
          Enviamos um link de acesso para <span className="text-fg">{sentTo}</span>. Clique nele e
          você entra direto, sem digitar nada.
        </p>

        {send.isError && (
          <div className="mt-6 text-left">
            <ErrorAlert>{errorMessage(send.error)}</ErrorAlert>
          </div>
        )}

        <div className="mt-8 flex flex-col items-center gap-2">
          <Button
            variant="outline"
            loading={send.isPending}
            disabled={cooldown > 0}
            onClick={() => send.mutate(sentTo)}
          >
            {cooldown > 0 ? `Reenviar em ${cooldown}s` : 'Reenviar link'}
          </Button>
          <Button variant="ghost" onClick={() => setSentTo(null)}>
            Usar outro e-mail
          </Button>
        </div>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="animate-rise">
      <h1 className="font-display text-4xl font-semibold leading-[1.05] tracking-tight">
        Converse com
        <br />
        <span className="bg-linear-to-r from-accent-soft to-mint bg-clip-text text-transparent">
          seus PDFs
        </span>
        .
      </h1>
      <p className="mt-4 text-muted">
        Envie um documento e faça perguntas em linguagem natural. Entre com seu e-mail, sem senha.
      </p>

      <label htmlFor="email" className="mt-8 block text-sm font-medium text-muted">
        E-mail
      </label>
      <input
        id="email"
        type="email"
        required
        autoFocus
        autoComplete="email"
        placeholder="voce@exemplo.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        className="mt-2 h-12 w-full rounded-xl border border-line bg-white/4 px-4 text-fg outline-none transition placeholder:text-muted/60 focus:border-accent focus:bg-white/6 focus:ring-4 focus:ring-accent/20"
      />

      {send.isError && (
        <div className="mt-4">
          <ErrorAlert>{errorMessage(send.error)}</ErrorAlert>
        </div>
      )}

      <Button type="submit" loading={send.isPending} className="mt-4 h-12 w-full text-base">
        Receber link de acesso
        <ArrowRight className="size-4" />
      </Button>
    </form>
  )
}
