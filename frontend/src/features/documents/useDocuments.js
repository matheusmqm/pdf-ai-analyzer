import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage, fileExtension, MAX_UPLOAD_MB } from '@/lib/utils'
import { deleteDocument, downloadDocument, listDocuments, uploadDocument } from './api'

export const DOCUMENTS_KEY = ['documents']

export const useDocuments = () => useQuery({ queryKey: DOCUMENTS_KEY, queryFn: listDocuments })

export function useDeleteDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  })
}

export const useDownloadDocument = () => useMutation({ mutationFn: downloadDocument })

// ---------------------------------------------------------------------------
// Fila de upload: vários PDFs de uma vez, dois em paralelo.

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
    // Itens concluídos somem sozinhos; os com erro ficam até serem dispensados.
    if (change.status === 'done') {
      setTimeout(() => setItems((current) => current.filter((item) => item.id !== id)), 4000)
    }
  }, [])

  // Função nomeada: ela se chama de novo quando um envio termina (puxa o próximo da fila).
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
        if (fileExtension(file.name) !== 'pdf') bad.push(`${file.name}: só PDF é suportado.`)
        else if (file.size > MAX_UPLOAD_MB * 1024 * 1024) bad.push(`${file.name}: passa de ${MAX_UPLOAD_MB} MB.`)
        else if (file.size === 0) bad.push(`${file.name}: o arquivo está vazio.`)
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
