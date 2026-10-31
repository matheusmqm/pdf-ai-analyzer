import { CloudUpload } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'
import { ErrorAlert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { cn, errorMessage } from '@/lib/utils'
import { useUploadDocument } from '../useDocuments'

const MAX_BYTES = 20 * 1024 * 1024

export function UploadDropzone() {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const upload = useUploadDocument()

  const handleFile = (file: File | undefined) => {
    if (!file) return
    setLocalError(null)
    if (file.type !== 'application/pdf') return setLocalError('O arquivo precisa ser um PDF.')
    if (file.size > MAX_BYTES) return setLocalError('O PDF pode ter no máximo 20 MB.')
    upload.mutate(file)
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    handleFile(event.dataTransfer.files[0])
  }

  const error = localError ?? (upload.isError ? errorMessage(upload.error) : null)

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={upload.isPending}
        onClick={() => inputRef.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'group flex w-full cursor-pointer flex-col items-center gap-3 rounded-3xl border border-dashed px-6 py-12 text-center transition',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft',
          dragging
            ? 'border-accent bg-accent/10'
            : 'border-white/15 bg-white/3 hover:border-accent/60 hover:bg-white/5',
          upload.isPending && 'cursor-wait opacity-70',
        )}
      >
        <span className="grid size-14 place-items-center rounded-2xl bg-linear-to-br from-accent/30 to-mint/20 text-accent-soft transition group-hover:scale-105">
          {upload.isPending ? <Spinner className="size-6" /> : <CloudUpload className="size-7" />}
        </span>
        <span className="font-display text-xl font-medium">
          {upload.isPending ? 'Enviando…' : 'Arraste um PDF ou clique para escolher'}
        </span>
        <span className="text-sm text-muted">Até 20 MB</span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(event) => {
          handleFile(event.target.files?.[0])
          event.target.value = ''
        }}
      />

      {error && <ErrorAlert>{error}</ErrorAlert>}
    </div>
  )
}
