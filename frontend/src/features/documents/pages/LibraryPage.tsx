import { ErrorAlert } from '@/components/ui/Alert'
import { errorMessage } from '@/lib/utils'
import { DocumentCard } from '../components/DocumentCard'
import { UploadDropzone } from '../components/UploadDropzone'
import { useDocuments } from '../useDocuments'

export default function LibraryPage() {
  const documents = useDocuments()

  return (
    <div className="animate-rise">
      <h1 className="font-display text-4xl font-semibold tracking-tight">Seus documentos</h1>
      <p className="mt-2 text-muted">Envie um PDF e pergunte o que quiser sobre ele.</p>

      <div className="mt-8">
        <UploadDropzone />
      </div>

      <section className="mt-10" aria-label="Lista de documentos">
        {documents.isPending && (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-20 animate-pulse-soft rounded-2xl bg-white/4" />
            ))}
          </div>
        )}

        {documents.isError && <ErrorAlert>{errorMessage(documents.error)}</ErrorAlert>}

        {documents.data?.length === 0 && (
          <p className="rounded-2xl border border-line px-6 py-10 text-center text-muted">
            Nenhum documento ainda. Envie o primeiro acima.
          </p>
        )}

        {documents.data && documents.data.length > 0 && (
          <div className="space-y-3">
            {documents.data.map((document) => (
              <DocumentCard key={document.id} document={document} />
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
