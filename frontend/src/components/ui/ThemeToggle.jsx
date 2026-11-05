import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/lib/theme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const next = theme === 'dark' ? 'Paper' : 'Night'
  return (
    <button
      type="button"
      className="sm-iconbtn"
      onClick={toggle}
      aria-label={`Switch to the ${next} theme`}
      title={`${next} theme`}
    >
      {theme === 'dark' ? <Sun className="sm-ico" aria-hidden /> : <Moon className="sm-ico" aria-hidden />}
    </button>
  )
}
