import { useEffect, useState } from 'react'
import { ErrorAlert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { getDocumentUrl } from '../api'

type State = { status: 'loading' } | { status: 'ready'; src: string } | { status: 'error' }

// O PDF é baixado para um blob local: o Storage pode servir o arquivo com
// cabeçalhos que impedem a exibição direta dentro de um iframe.
export function PdfViewer({ documentId, title }: { documentId: string; title: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | undefined

    getDocumentUrl(documentId, true)
      .then(({ url }) => fetch(url, { signal: controller.signal }))
      .then((response) => {
        if (!response.ok) throw new Error('download')
        return response.blob()
      })
      .then((blob) => {
        if (controller.signal.aborted) return
        objectUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }))
        setState({ status: 'ready', src: objectUrl })
      })
      .catch(() => {
        if (!controller.signal.aborted) setState({ status: 'error' })
      })

    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [documentId])

  if (state.status === 'error') {
    return <ErrorAlert>Não foi possível exibir o PDF. Você ainda pode baixá-lo.</ErrorAlert>
  }

  return (
    <div className="relative h-full min-h-[60vh] overflow-hidden rounded-2xl border border-line bg-surface">
      {state.status === 'loading' ? (
        <div className="grid h-full min-h-[60vh] place-items-center text-muted">
          <Spinner className="size-6" />
        </div>
      ) : (
        <iframe title={title} src={state.src} className="absolute inset-0 size-full" />
      )}
    </div>
  )
}
