import { useSyncExternalStore } from 'react'

// Dois temas do design system: "light" (Papel) e "dark" (Noite).
 

const KEY = 'secondmind.theme'
const listeners = new Set()

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readTheme() {
  const current = document.documentElement.dataset.theme
  return current === 'dark' || current === 'light' ? current : systemTheme()
}

// O script do index.html já definiu data-theme antes da primeira pintura; aqui só trocamos.
export function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // Sem armazenamento: a escolha vale só nesta visita.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  // Enquanto a pessoa não escolheu, segue a preferência do sistema.
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystem = () => {
    try {
      if (localStorage.getItem(KEY)) return
    } catch {
      // ignora
    }
    document.documentElement.dataset.theme = systemTheme()
    listener()
  }
  media.addEventListener('change', onSystem)
  return () => {
    listeners.delete(listener)
    media.removeEventListener('change', onSystem)
  }
}

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => 'light' )
  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') }
}
