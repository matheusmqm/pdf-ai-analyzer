import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { downloadDocument, listDocuments, uploadDocument } from './api'

const DOCUMENTS_KEY = ['documents']

export const useDocuments = () => useQuery({ queryKey: DOCUMENTS_KEY, queryFn: listDocuments })

export function useUploadDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: DOCUMENTS_KEY }),
  })
}

export const useDownloadDocument = () => useMutation({ mutationFn: downloadDocument })
