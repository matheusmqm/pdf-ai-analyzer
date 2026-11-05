import { FileText, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorAlert } from '@/components/ui/Alert'

import { Answer } from './Answer'
import { Thinking, useElapsed } from './Thinking'



const pageLabel = (s) => (s.page_start === s.page_end ? `p. ${s.page_start}` : `pp. ${s.page_start}-${s.page_end}`)

const seconds = (ms) => (ms == null ? null : `${(ms / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} s`)

export function ChatTurn({ message, onRetry }) {
  const pending = message.status === 'pending'
  const elapsed = useElapsed(pending)

  return (
    <>
      <p className="sm-msg-user">{message.question}</p>

      {pending && <Thinking label="Searching the documents" seconds={elapsed} />}

      {message.status === 'done' && message.answer && (
        <>
          <Answer text={message.answer} />
          {message.sources?.length > 0 && (
            <div className="sm-refs" aria-label="Sources" style={{ marginBottom: 'var(--space-3)' }}>
              {message.sources.map((source) => (
                <Link
                  key={`${source.ref}-${source.document_id}-${source.page_start}`}
                  to={`/documents/${source.document_id}?page=${source.page_start}`}
                  className="sm-sugg"
                  title={`Open ${source.filename}`}
                >
                  <FileText className="sm-ico" style={{ width: 14, height: 14 }} aria-hidden />
                  <span>
                    [{source.ref}] {source.filename}, {pageLabel(source)}
                  </span>
                </Link>
              ))}
            </div>
          )}
          <div className="sm-meta-note">{message.latencyMs != null && <span>{seconds(message.latencyMs)}</span>}</div>
        </>
      )}

      {message.status === 'error' && (
        <div style={{ marginBottom: 'var(--space-5)' }}>
          <ErrorAlert>{message.error}</ErrorAlert>
          <button type="button" className="sm-btn sm-btn--ghost sm-btn--sm mt-2" onClick={() => onRetry(message.id)}>
            <RotateCcw className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
            Try again
          </button>
        </div>
      )}
    </>
  )
}
