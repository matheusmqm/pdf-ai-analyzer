import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileStamp } from '@/components/ui/FileStamp'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

import { useDeleteDocument, useDownloadDocument } from '../useDocuments'

function StatusBadge({ doc }) {
  if (doc.status === 'pending' || doc.status === 'processing') {
    return (
      <span className="sm-tag" role="status">
        <Spinner /> Processing
      </span>
    )
  }
  if (doc.status === 'failed') return <span className="sm-tag">Failed</span>
  return doc.page_count ? <span className="sm-tag">{doc.page_count} {doc.page_count === 1 ? 'page' : 'pages'}</span> : null
}

// Document card: opens the PDF; download and delete sit beside it.
export function FileCard({ doc }) {
  const download = useDownloadDocument()
  const remove = useDeleteDocument()
  const [confirming, setConfirming] = useState(false)

  return (
    <article className="sm-filecard sm-rise">
      <Link to={`/documents/${doc.id}`} className="sm-filecard-main" aria-label={`Open ${doc.filename}`}>
        <FileStamp ext="pdf" size="tile" />
        <div className="sm-filecard-body">
          <h3 className="sm-filecard-title" title={doc.filename}>
            {doc.filename}
          </h3>
          <p className="sm-filecard-meta">
            <span>{formatDate(doc.created_at)}</span>
            <span aria-hidden>·</span>
            <span>PDF</span>
            <StatusBadge doc={doc} />
          </p>
          {doc.status === 'failed' && doc.error && (
            <p className="sm-filecard-meta" style={{ color: 'var(--danger)' }}>
              {doc.error}
            </p>
          )}
        </div>
      </Link>

      <div className="sm-filecard-actions">
        {confirming ? (
          <>
            <button
              type="button"
              className="sm-btn sm-btn--danger sm-btn--sm"
              disabled={remove.isPending}
              onClick={() => remove.mutate(doc.id, { onSettled: () => setConfirming(false) })}
            >
              {remove.isPending ? <Spinner /> : 'Delete'}
            </button>
            <button type="button" className="sm-btn sm-btn--ghost sm-btn--sm" onClick={() => setConfirming(false)}>
              Cancel
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="sm-iconbtn"
              aria-label={`Download ${doc.filename}`}
              title="Download"
              disabled={download.isPending}
              onClick={() => download.mutate(doc.id)}
            >
              {download.isPending ? <Spinner /> : <Download className="sm-ico" aria-hidden />}
            </button>
            <button
              type="button"
              className="sm-iconbtn sm-iconbtn--danger"
              aria-label={`Delete ${doc.filename}`}
              title="Delete"
              onClick={() => setConfirming(true)}
            >
              <Trash2 className="sm-ico" aria-hidden />
            </button>
          </>
        )}
      </div>
    </article>
  )
}
