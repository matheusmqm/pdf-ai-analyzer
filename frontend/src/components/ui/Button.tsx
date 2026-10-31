import type { ButtonHTMLAttributes } from 'react'
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'outline'
  loading?: boolean
}

const variants = {
  primary:
    'bg-linear-to-br from-accent to-[#6b4df0] text-white shadow-[0_8px_24px_-8px] shadow-accent/60 hover:brightness-110',
  outline: 'border border-line bg-white/3 text-fg hover:bg-white/8',
  ghost: 'text-muted hover:bg-white/6 hover:text-fg',
}

export function Button({
  variant = 'primary',
  loading,
  disabled,
  className,
  children,
  ...props
}: Props) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-soft',
        'disabled:cursor-not-allowed disabled:opacity-50',
        variants[variant],
        className,
      )}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
