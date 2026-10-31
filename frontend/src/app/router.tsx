import { lazy } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { AppLayout } from './layouts/AppLayout'
import { AuthLayout } from './layouts/AuthLayout'

const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage'))
const CallbackPage = lazy(() => import('@/features/auth/pages/CallbackPage'))
const LibraryPage = lazy(() => import('@/features/documents/pages/LibraryPage'))
const DocumentPage = lazy(() => import('@/features/documents/pages/DocumentPage'))

export const router = createBrowserRouter([
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/auth/callback', element: <CallbackPage /> },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { path: '/', element: <LibraryPage /> },
          { path: '/documents/:id', element: <DocumentPage /> },
        ],
      },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
])
