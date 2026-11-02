import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'Papel' : 'Noite'
  return (
    <button
      type="button"
      className="sm-iconbtn"
      onClick={toggle}
      aria-label={`Trocar para o tema ${next}`}
      title={`Tema ${next}`}
    >
      {theme === 'dark' ? <Sun className="sm-ico" aria-hidden /> : <Moon className="sm-ico" aria-hidden />}
    </button>
  )
}
