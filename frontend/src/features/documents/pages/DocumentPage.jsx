import { ArrowLeft, Download, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ErrorAlert } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { FileStamp } from '@/components/ui/FileStamp'
import { errorMessage } from '@/lib/utils'
import { PdfViewer } from '../components/PdfViewer'
import { SheetViewer } from '../components/SheetViewer'
import { useDeleteDocument, useDocuments, useDownloadDocument } from '../useDocuments'

export default function DocumentPage() {
  const { id = '' } = useParams()
  const [searchParams] = useSearchParams()
  const page = Number.parseInt(searchParams.get('page') ?? '', 10) || undefined
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
        <p className="sm-empty-title">Document not found</p>
        <p className="mt-1 mb-4">It may have been deleted.</p>
        <Link to="/" className="sm-btn sm-btn--outline">
          Back to documents
        </Link>
      </div>
    )
  }

  const isSpreadsheet = doc.file_type === 'xlsx' || doc.file_type === 'csv'

  return (
    <div className="sm-rise">
      <Link to="/" className="sm-btn sm-btn--ghost sm-btn--sm mb-3" style={{ marginLeft: -12 }}>
        <ArrowLeft className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
        Documents
      </Link>

      <header className="sm-pagehead flex flex-wrap items-center gap-4">
        <FileStamp ext={doc.file_type ?? 'pdf'} size="xl" />
        <h1 className="display-md m-0 min-w-0 flex-1" style={{ overflowWrap: 'anywhere' }}>
          {doc.filename}
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" loading={download.isPending} onClick={() => download.mutate(doc.id)}>
            <Download className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
            Download
          </Button>
          {confirming ? (
            <>
              <Button
                variant="danger"
                size="sm"
                loading={remove.isPending}
                onClick={() => remove.mutate(doc.id, { onSuccess: () => navigate('/', { replace: true }) })}
              >
                Confirm deletion
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
                Cancel
              </Button>
            </>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => setConfirming(true)}>
              <Trash2 className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
              Delete
            </Button>
          )}
        </div>
      </header>

      {(download.isError || remove.isError) && (
        <div className="mt-3">
          <ErrorAlert>{errorMessage(download.error ?? remove.error)}</ErrorAlert>
        </div>
      )}

      {isSpreadsheet ? (
        doc.status === 'ready' ? (
          <SheetViewer key={`sheet-${doc.id}`} documentId={doc.id} />
        ) : (
          <ErrorAlert>{doc.status === 'failed' ? doc.error : 'The file is still being processed.'}</ErrorAlert>
        )
      ) : (
        <PdfViewer key={`pdf-${doc.id}`} documentId={doc.id} title={doc.filename} page={page} />
      )}
    </div>
  )
}
