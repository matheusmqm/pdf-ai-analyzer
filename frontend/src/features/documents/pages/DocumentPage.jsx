import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ErrorAlert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FileStamp } from '@/components/ui/FileStamp'
import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { errorMessage } from '@/lib/utils'
import { PdfViewer } from '../components/PdfViewer'
import { useDeleteDocument, useDocuments, useDownloadDocument } from '../useDocuments'

export default function DocumentPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const documents = useDocuments()
  const download = useDownloadDocument()
  const remove = useDeleteDocument()
  const [confirming, setConfirming] = useState(false)
  const doc = documents.data?.find((item) => item.id === id)

  if (documents.isPending) {
    return (
      <div className="sm-stack" aria-hidden>
        <div className="sm-skeleton" style={{ height: 120 }} />
        <div className="sm-skeleton" style={{ height: 240 }} />
      </div>
    )
  }
  if (documents.isError) return <ErrorAlert>{errorMessage(documents.error)}</ErrorAlert>
  if (!doc) {
    return (
      <div className="sm-empty">
        <p className="note-xl m-0" style={{ color: 'var(--ink)' }}>
          não achei esse PDF
        </p>
        <p className="mt-2 mb-4">Ele pode ter sido apagado.</p>
        <Link to="/" className="sm-btn sm-btn--outline">
          Voltar aos PDFs
        </Link>
      </div>
    )
  }

  return (
    <div className="sm-rise">
      <Link to="/" className="sm-btn sm-btn--ghost sm-btn--sm mb-3" style={{ marginLeft: -12 }}>
        <ArrowLeft className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
        Seus PDFs
      </Link>

      <header className="flex flex-wrap items-center gap-4">
        <FileStamp ext="pdf" size="xl" />
        <h1 className="display-md m-0 min-w-0 flex-1" style={{ overflowWrap: 'anywhere' }}>
          {doc.filename}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" loading={download.isPending} onClick={() => download.mutate(doc.id)}>
            <Download className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
            Baixar
          </Button>
          {confirming ? (
            <>
              <Button
                variant="danger"
                size="sm"
                loading={remove.isPending}
                onClick={() => remove.mutate(doc.id, { onSuccess: () => navigate('/', { replace: true }) })}
              >
                Apagar de vez
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancelar
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
              Apagar
            </Button>
          )}
        </div>
      </header>

      {(download.isError || remove.isError) && (
        <div className="mt-3">
          <ErrorAlert>{errorMessage(download.error ?? remove.error)}</ErrorAlert>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2" style={{ alignItems: 'start' }}>
        <PdfViewer key={`pdf-${doc.id}`} documentId={doc.id} title={doc.filename} />
        <div className="sm-sticky">
          <ChatPanel key={`chat-${doc.id}`} documentId={doc.id} />
        </div>
      </div>
    </div>
  )
}
