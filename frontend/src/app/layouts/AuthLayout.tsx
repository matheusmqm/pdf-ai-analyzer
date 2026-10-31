import { Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'

export function AuthLayout() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-12">
      <Logo className="mb-10" />
      <Outlet />
    </main>
  )
}
