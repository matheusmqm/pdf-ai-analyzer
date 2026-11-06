import { FileSpreadsheet, FileText, RotateCcw } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ErrorAlert } from '@/components/ui/Alert'

import { Answer } from './Answer'
import { Thinking, useElapsed } from './Thinking'

const pageLabel = (s) => (s.page_start === s.page_end ? `p. ${s.page_start}` : `pp. ${s.page_start}-${s.page_end}`)

const sourceLabel = (s) => (s.kind === 'sheet' ? `sheet ${s.sheet_name}` : pageLabel(s))

const seconds = (ms) => (ms == null ? null : `${(ms / 1000).toLocaleString('en-US', { maximumFractionDigits: 1 })} s`)

const money = (usd) => `~US$ ${usd.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 4 })}`

const TOOL_LABELS = {
  routing: 'Chose the spreadsheet agent',
  search_documents: 'Searched the documents',
  list_tables: 'Listed the spreadsheet tables',
  describe_table: 'Inspected a table',
  run_sql: 'Ran a query',
}

// "How I got this": each tool call the agent made, with the SQL it ran.
function Trace({ trace }) {
  return (
    <details className="sm-trace">
      <summary>How this answer was built ({trace.length} {trace.length === 1 ? 'step' : 'steps'})</summary>
      <ol>
        {trace.map((step, index) => (
          <li key={index} className={step.error ? 'is-error' : undefined}>
            <span className="sm-trace-name">{TOOL_LABELS[step.tool] ?? step.tool}</span>
            <span className="sm-trace-sum"> · {step.summary}</span>
            {step.tool === 'search_documents' && step.input?.query && (
              <code className="sm-trace-code">{step.input.query}</code>
            )}
            {step.tool === 'run_sql' && step.input?.query && <code className="sm-trace-code">{step.input.query}</code>}
          </li>
        ))}
      </ol>
    </details>
  )
}

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
              {message.sources.map((source) => {
                const Icon = source.kind === 'sheet' ? FileSpreadsheet : FileText
                return (
                  <Link
                    key={source.ref}
                    to={
                      source.kind === 'sheet'
                        ? `/documents/${source.document_id}`
                        : `/documents/${source.document_id}?page=${source.page_start}`
                    }
                    className="sm-sugg"
                    title={source.sql ? `${source.filename}\n${source.sql}` : `Open ${source.filename}`}
                  >
                    <Icon className="sm-ico" style={{ width: 14, height: 14 }} aria-hidden />
                    <span>
                      [{source.ref}] {source.filename}, {sourceLabel(source)}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
          {message.trace?.length > 0 && <Trace trace={message.trace} />}
          <div className="sm-meta-note">
            {message.latencyMs != null && <span>{seconds(message.latencyMs)}</span>}
            {message.usage && (
              <span title={`${message.usage.input_tokens} input / ${message.usage.output_tokens} output tokens`}>
                {message.usage.steps} {message.usage.steps === 1 ? 'call' : 'calls'} to the model,{' '}
                {money(message.usage.cost_usd)}
              </span>
            )}
          </div>
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
