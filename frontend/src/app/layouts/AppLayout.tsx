import { LogOut } from 'lucide-react'
import { Link, Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { signOut } from '@/features/auth/useSession'

export function AppLayout() {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line bg-ink/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link to="/" aria-label="Início">
            <Logo />
          </Link>
          <button
            type="button"
            onClick={signOut}
            className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-xl px-3 text-sm text-muted transition hover:bg-white/8 hover:text-fg"
          >
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <Outlet />
      </main>
    </div>
  )
}
