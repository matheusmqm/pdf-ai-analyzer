import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, fileExtension, MAX_UPLOAD_MB } from '@/lib/utils'
import { deleteDocument, downloadDocument, listDocuments, uploadDocument } from './api'

export const DOCUMENTS_KEY = ['documents']

// While any PDF is being processed in the background, the list refreshes itself.
const isBusy = (doc) => doc.status === 'pending' || doc.status === 'processing'

export const useDocuments = () =>
  useQuery({
    queryKey: DOCUMENTS_KEY,
    queryFn: listDocuments,
    refetchInterval: (query) => (query.state.data?.some(isBusy) ? 3000 : false),
  })

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  })
}

export const useDownloadDocument = () => useMutation({ mutationFn: downloadDocument })

// ---------------------------------------------------------------------------
// Upload queue: several PDFs at once, two in parallel.

export const ACCEPT_ATTR = '.pdf,application/pdf'
const CONCURRENCY = 2

 






export function useUploadQueue() {
  const queryClient = useQueryClient()
  const [items, setItems] = useState([])
  const [rejected, setRejected] = useState([])
  const pending = useRef([])
  const running = useRef(0)

  const patch = useCallback((id, change) => {
    setItems((current) => current.map((item) => (item.id === id ? { ...item, ...change } : item)))
    // Finished items disappear on their own; failed ones stay until dismissed.
    if (change.status === 'done') {
      setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4000)
    }
  }, [])

  // Named function: it calls itself again when an upload finishes (pulls the next from the queue).
  const pump = useCallback(function run() {
    while (running.current < CONCURRENCY && pending.current.length) {
      const next = pending.current.shift()
      running.current++
      uploadDocument(next.file)
        .then(() => patch(next.id, { status: 'done' }))
        .catch((error) => patch(next.id, { status: 'error', error: errorMessage(error) }))
        .finally(() => {
          running.current--
          queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY })
          run()
        })
    }
  }, [patch, queryClient])

  const add = useCallback(
    (files) => {
      const bad = []
      const good = []
      for (const file of files) {
        if (fileExtension(file.name) !== 'pdf') bad.push(`${file.name}: only PDF is supported.`)
        else if (file.size > MAX_UPLOAD_MB * 1024 * 1024) bad.push(`${file.name}: exceeds ${MAX_UPLOAD_MB} MB.`)
        else if (file.size === 0) bad.push(`${file.name}: the file is empty.`)
        else {
          const id = crypto.randomUUID()
          good.push({ id, name: file.name, status: 'uploading' })
          pending.current.push({ id, file })
        }
      }
      setRejected(bad)
      if (good.length) {
        setItems((current) => [...good, ...current])
        pump()
      }
    },
    [pump],
  )

  const dismiss = useCallback((id) => setItems((c) => c.filter((i) => i.id !== id)), [])
  const clearRejected = useCallback(() => setRejected([]), [])

  useEffect(
    () => () => {
      pending.current = []
    },
    [],
  )

  return { items, rejected, add, dismiss, clearRejected }
}
