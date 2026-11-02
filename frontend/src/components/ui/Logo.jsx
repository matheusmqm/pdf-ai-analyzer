import { useId } from 'react'
import { useTheme } from '@/lib/theme'
import { cn } from '@/lib/utils'

// Dois laços desenhados à mão que se cruzam: a sua mente e a segunda mente; a interseção é marca-texto.
// As cores vão gravadas (SVG por <img> não herda currentColor), então escolhemos pelo tema.
const COLORS = {
  light: { ink: '#2b2723', pen: '#28407a', marker: '#f4e08a' },
  dark: { ink: '#efe9dc', pen: '#a8bcf0', marker: '#a58f2a' },
} 

export function LogoMark({ size = 36, className }) {
  const { theme } = useTheme()
  const c = COLORS[theme]
  const clip = useId()
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <defs>
        <clipPath id={clip}>
          <circle cx="12.5" cy="16" r="8.4" />
        </clipPath>
      </defs>
      <circle cx="19.5" cy="16" r="8.4" fill={c.marker} clipPath={`url(#${clip})`} />
      <path
        d="M13.4 7.5C8.7 7 4.6 10.5 4.3 15.2 4 19.9 7.7 24 12.4 24.4 17 24.8 21 21.3 21.4 16.7 21.7 13.2 19.8 10 16.8 8.6"
        stroke={c.ink}
        strokeWidth="1.9"
      />
      <path
        d="M19 7.4C23.8 7.1 27.9 10.7 28.1 15.4 28.3 20.1 24.6 24 20 24.2 15.6 24.4 11.8 21 11.4 16.6 11.1 13.4 12.7 10.4 15.5 8.9"
        stroke={c.pen}
        strokeWidth="1.9"
      />
    </svg>
  )
}

/** Marca completa. `database` anotado embaixo, em itálico, no cabeçalho do app e no login. */
export function Logo({ withNote = true, className }) {
  return (
    <span className={cn('sm-logo', className)}>
      <LogoMark />
      <span>
        <span className="sm-logo-name">SecondMind</span>
        {withNote && <span className="sm-logo-sub">database</span>}
      </span>
    </span>
  )
}
