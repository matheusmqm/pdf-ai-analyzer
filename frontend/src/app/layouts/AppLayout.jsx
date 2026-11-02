import { Link, Outlet } from 'react-router-dom'
import { Logo } from '@/components/ui/Logo'
import { ThemeToggle } from '@/components/ui/ThemeToggle'

export function AppLayout() {
  return (
    <div className="sm-page min-h-dvh">
      <header className="sm-topbar">
        <div className="sm-topbar-in">
          <Link to="/" aria-label="SecondMind: início" className="rounded-md">
            <Logo />
          </Link>
          <div className="flex items-center gap-1">
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main className="sm-container">
        <Outlet />
      </main>
    </div>
  )
}
