
import { cn } from '@/lib/utils'

/** Sublinhado à caneta numa palavra de título (no máximo um por tela). */
export const Scribble = ({ children }) => (
  <span className="sm-scribble">{children}</span>
)

/** Anotação em itálico na margem. */
export const Note = ({
  children,
  className,
  tilt = 0,
}



) => (
  <span className={cn('sm-note', className)} style={tilt ? { display: 'inline-block', transform: `rotate(${tilt}deg)` } : undefined}>
    {children}
  </span>
)

/** Fita de marca-texto que prende a folha de login. */
export const Tape = () => <span className="sm-tape" aria-hidden />

export function HandArrow({ rotate = 0, className }) {
  return (
    <svg
      className={cn('sm-arrow', className)}
      viewBox="0 0 64 56"
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden
    >
      <path d="M6 6C26 2 52 16 54 46" />
      <path d="M43 38 54 48 62 36" />
    </svg>
  )
}
