import { useSyncExternalStore } from 'react'

// Two design-system themes: "light" (Paper) and "dark" (Night).
 

const KEY = 'secondmind.theme'
const listeners = new Set()

function systemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function readTheme() {
  const current = document.documentElement.dataset.theme
  return current === 'dark' || current === 'light' ? current : systemTheme()
}

// The index.html script already set data-theme before first paint; here we only switch.
export function setTheme(theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(KEY, theme)
  } catch {
    // No storage: the choice only lasts for this visit.
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener) {
  listeners.add(listener)
  // Until the user picks one, follow the system preference.
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const onSystem = () => {
    try {
      if (localStorage.getItem(KEY)) return
    } catch {
      // ignore
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
