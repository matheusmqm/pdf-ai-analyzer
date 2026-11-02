import { Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FileStamp } from '@/components/ui/FileStamp'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'

import { useDeleteDocument, useDownloadDocument } from '../useDocuments'

// Ficha solta sobre a mesa: abre o PDF; baixar e apagar ficam do lado.
export function FileCard({ doc }) {
  const download = useDownloadDocument()
  const remove = useDeleteDocument()
  const [confirming, setConfirming] = useState(false)

  return (
    <article className="sm-filecard sm-rise">
      <Link to={`/documents/${doc.id}`} className="sm-filecard-main" aria-label={`Abrir ${doc.filename}`}>
        <FileStamp ext="pdf" size="tile" />
        <div className="sm-filecard-body">
          <h3 className="sm-filecard-title" title={doc.filename}>
            {doc.filename}
          </h3>
          <p className="sm-filecard-meta">
            <span>{formatDate(doc.created_at)}</span>
            <span aria-hidden>·</span>
            <span>PDF</span>
          </p>
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
              {remove.isPending ? <Spinner /> : 'Apagar'}
            </button>
            <button type="button" className="sm-btn sm-btn--ghost sm-btn--sm" onClick={() => setConfirming(false)}>
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="sm-iconbtn"
              aria-label={`Baixar ${doc.filename}`}
              title="Baixar"
              disabled={download.isPending}
              onClick={() => download.mutate(doc.id)}
            >
              {download.isPending ? <Spinner /> : <Download className="sm-ico" aria-hidden />}
            </button>
            <button
              type="button"
              className="sm-iconbtn sm-iconbtn--danger"
              aria-label={`Apagar ${doc.filename}`}
              title="Apagar"
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
