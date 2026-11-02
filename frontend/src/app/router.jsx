import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { AppLayout } from './layouts/AppLayout'

const LibraryPage = lazy(() => import('@/features/documents/pages/LibraryPage'))
const DocumentPage = lazy(() => import('@/features/documents/pages/DocumentPage'))

// Sem login: um único usuário, vários PDFs.
export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: '/', element: <LibraryPage /> },
      { path: '/documents/:id', element: <DocumentPage /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
