import { Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { ErrorAlert } from '@/components/ui/Alert'
import { errorMessage } from '@/lib/utils'
import { useDocuments } from '../useDocuments'
import { Dropzone } from './Dropzone'
import { FileCard } from './FileCard'

export function Library() {
  const documents = useDocuments()
  const [query, setQuery] = useState('')

  const shown = useMemo(() => {
    const term = query.trim().toLowerCase()
    const all = documents.data ?? []
    return term ? all.filter((d) => d.filename.toLowerCase().includes(term)) : all
  }, [documents.data, query])

  const total = documents.data?.length ?? 0

  return (
    <div>
      <Dropzone compact={total > 0} />

      <div className="sm-section-title" style={{ marginTop: 'var(--space-8)' }}>
        <h2 className="title-md">Seus PDFs</h2>
        {total > 0 && (
          <span className="sm-note" aria-live="polite">
            {shown.length === total ? `${total} ${total === 1 ? 'PDF' : 'PDFs'}` : `${shown.length} de ${total}`}
          </span>
        )}
      </div>

      {total > 4 && (
        <div className="sm-search mb-4">
          <Search className="sm-ico" aria-hidden />
          <input
            type="search"
            className="sm-input sm-input--icon"
            placeholder="Buscar por nome"
            aria-label="Buscar PDFs por nome"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

      <section aria-label="Lista de PDFs">
        {documents.isPending && (
          <div className="sm-stack" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="sm-skeleton" />
            ))}
          </div>
        )}

        {documents.isError && <ErrorAlert>{errorMessage(documents.error)}</ErrorAlert>}

        {documents.data && total === 0 && (
          <div className="sm-empty">
            <p className="note-lg m-0" style={{ color: 'var(--ink)' }}>
              nenhum PDF ainda
            </p>
            <p className="m-0 mt-2">Envie o primeiro acima e comece a conversar com ele.</p>
          </div>
        )}

        {total > 0 && shown.length === 0 && <p className="sm-empty m-0">Nenhum PDF com “{query}”.</p>}

        {shown.length > 0 && (
          <div className="sm-stack">
            {shown.map((doc) => (
              <FileCard key={doc.id} doc={doc} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
