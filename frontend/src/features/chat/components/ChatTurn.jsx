import { RotateCcw } from 'lucide-react'
import { ErrorAlert } from '@/components/ui/Alert'

import { Answer } from './Answer'
import { Thinking, useElapsed } from './Thinking'



const seconds = (ms) => (ms == null ? null : `${(ms / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} s`)

export function ChatTurn({ message, onRetry }) {
  const pending = message.status === 'pending'
  const elapsed = useElapsed(pending)

  return (
    <>
      <p className="sm-msg-user">{message.question}</p>

      {pending && <Thinking label="lendo o PDF" seconds={elapsed} />}

      {message.status === 'done' && message.answer && (
        <>
          <Answer text={message.answer} />
          <div className="sm-meta-note">{message.latencyMs != null && <span>{seconds(message.latencyMs)}</span>}</div>
        </>
      )}

      {message.status === 'error' && (
        <div style={{ marginBottom: 'var(--line-pitch)' }}>
          <ErrorAlert>{message.error}</ErrorAlert>
          <button type="button" className="sm-btn sm-btn--ghost sm-btn--sm mt-2" onClick={() => onRetry(message.id)}>
            <RotateCcw className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
            Tentar de novo
          </button>
        </div>
      )}
    </>
  )
}
