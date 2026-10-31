import { ArrowLeft, Download } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/ui/Button'
import { ErrorAlert } from '@/components/ui/Alert'
import { errorMessage } from '@/lib/utils'
import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { PdfViewer } from '../components/PdfViewer'
import { useDocuments, useDownloadDocument } from '../useDocuments'

export default function DocumentPage() {
  const { id = '' } = useParams()
  const documents = useDocuments()
  const download = useDownloadDocument()
  const document = documents.data?.find((item) => item.id === id)

  if (documents.isPending) {
    return <div className="h-96 animate-pulse-soft rounded-3xl bg-white/4" />
  }
  if (documents.isError) return <ErrorAlert>{errorMessage(documents.error)}</ErrorAlert>
  if (!document) {
    return (
      <div className="py-20 text-center">
        <p className="text-muted">Documento não encontrado.</p>
        <Link to="/" className="mt-4 inline-block text-accent-soft hover:underline">
          Voltar aos documentos
        </Link>
      </div>
    )
  }

  return (
    <div className="animate-rise">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/"
          aria-label="Voltar aos documentos"
          className="grid size-10 shrink-0 place-items-center rounded-xl text-muted transition hover:bg-white/8 hover:text-fg"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate font-display text-2xl font-semibold tracking-tight">
          {document.filename}
        </h1>
        <Button
          variant="outline"
          loading={download.isPending}
          onClick={() => download.mutate(document.id)}
        >
          <Download className="size-4" />
          <span className="hidden sm:inline">Baixar</span>
        </Button>
      </div>

      {download.isError && (
        <div className="mb-4">
          <ErrorAlert>{errorMessage(download.error)}</ErrorAlert>
        </div>
      )}

      <div className="grid gap-6 lg:h-[calc(100vh-11rem)] lg:grid-cols-2">
        <PdfViewer key={`pdf-${document.id}`} documentId={document.id} title={document.filename} />
        <ChatPanel key={`chat-${document.id}`} documentId={document.id} />
      </div>
    </div>
  )
}
