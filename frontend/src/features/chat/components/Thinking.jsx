import { useEffect, useState } from 'react'

/** Seconds since `active` became true. */
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

// Three pulsing dots while the assistant searches the files.
export function Thinking({ label, seconds }) {
  return (
    <div className="sm-thinking" role="status">
      <span className="sm-dots" aria-hidden>
        <i />
        <i />
        <i />
      </span>
      <span>
        {label}… {seconds}s{seconds >= 20 && ' · This may take a few more moments.'}
      </span>
    </div>
  )
}
