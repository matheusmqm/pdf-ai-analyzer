import { cn } from '@/lib/utils'

export function Spinner({ className }) {
  return <span className={cn('sm-spinner', className)} role="presentation" aria-hidden />
}
