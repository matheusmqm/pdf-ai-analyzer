import { Download, FileText } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Spinner } from '@/components/ui/Spinner'
import { formatDate } from '@/lib/utils'
import type { PdfDocument } from '../api'
import { useDownloadDocument } from '../useDocuments'

export function DocumentCard({ document }: { document: PdfDocument }) {
  const download = useDownloadDocument()

  return (
    <article className="group relative flex items-center gap-4 rounded-2xl border border-line bg-white/3 p-4 transition hover:border-accent/40 hover:bg-white/5">
      <Link
        to={`/documents/${document.id}`}
        aria-label={`Abrir ${document.filename}`}
        className="absolute inset-0 rounded-2xl focus-visible:outline-2 focus-visible:outline-accent-soft"
      />

      <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-linear-to-br from-accent/25 to-mint/15 text-accent-soft">
        <FileText className="size-6" />
      </span>

      <div className="min-w-0 flex-1">
        <h3 className="truncate font-medium">{document.filename}</h3>
        <p className="mt-0.5 text-sm text-muted">
          {download.isError ? (
            <span className="text-danger">Não foi possível baixar.</span>
          ) : (
            formatDate(document.created_at)
          )}
        </p>
      </div>

      <button
        type="button"
        onClick={() => download.mutate(document.id)}
        disabled={download.isPending}
        aria-label={`Baixar ${document.filename}`}
        title="Baixar PDF"
        className="relative z-10 grid size-10 shrink-0 cursor-pointer place-items-center rounded-xl text-muted transition hover:bg-white/8 hover:text-fg focus-visible:outline-2 focus-visible:outline-accent-soft disabled:cursor-wait"
      >
        {download.isPending ? <Spinner /> : <Download className="size-5" />}
      </button>
    </article>
  )
}
