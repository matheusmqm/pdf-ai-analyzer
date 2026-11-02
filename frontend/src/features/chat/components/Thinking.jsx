import { useEffect, useState } from 'react'

/** Segundos desde que `active` ficou verdadeiro. */
export function useElapsed(active) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => {
    if (!active) return
    setSeconds(0)
    const timer = setInterval(() => setSeconds((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [active])
  return seconds
}

// Um traço de caneta que se desenha em ondas enquanto o assistente procura nos arquivos.
export function Thinking({ label, seconds }) {
  return (
    <div className="sm-thinking" role="status">
      <svg className="sm-pen" viewBox="0 0 64 16" aria-hidden>
        <path d="M2 9C8 2 12 14 18 8S28 2 34 8 44 14 50 8s8-5 12-2" />
      </svg>
      <span>
        {label}… {seconds}s{' '}
        {seconds >= 20 && <span className="sm-note">(pode demorar um pouquinho)</span>}
      </span>
    </div>
  )
}
