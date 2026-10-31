import { useEffect, useState } from 'react'

export function PendingBubble() {
  const [seconds, setSeconds] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  const elapsed = seconds >= 60 ? `${Math.floor(seconds / 60)}min ${seconds % 60}s` : `${seconds}s`

  return (
    <div className="flex items-center gap-3 text-sm text-muted" role="status">
      <span className="flex gap-1" aria-hidden>
        {[0, 1, 2].map((dot) => (
          <span
            key={dot}
            className="size-1.5 animate-pulse-soft rounded-full bg-accent-soft"
            style={{ animationDelay: `${dot * 0.2}s` }}
          />
        ))}
      </span>
      <span>Analisando o documento… {elapsed}</span>
      {seconds >= 20 && <span className="text-xs">(o modelo pode demorar alguns instantes)</span>}
    </div>
  )
}
