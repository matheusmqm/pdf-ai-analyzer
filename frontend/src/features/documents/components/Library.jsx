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

      <div className="sm-section-title" style={{ marginTop: 'var(--space-6)' }}>
        <h2 className="eyebrow">Uploaded files</h2>
        {total > 0 && (
          <span className="sm-tag" aria-live="polite">
            {shown.length === total ? `${total} ${total === 1 ? 'file' : 'files'}` : `${shown.length} of ${total}`}
          </span>
        )}
      </div>

      {total > 4 && (
        <div className="sm-search mb-4">
          <Search className="sm-ico" aria-hidden />
          <input
            type="search"
            className="sm-input sm-input--icon"
            placeholder="Search by file name"
            aria-label="Search files by name"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}

      <section aria-label="File list">
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
            <p className="sm-empty-title">No documents uploaded</p>
            <p className="m-0 mt-1">Upload your first file above to start asking questions about your base.</p>
          </div>
        )}

        {total > 0 && shown.length === 0 && <p className="sm-empty m-0">No documents found for “{query}”.</p>}

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
