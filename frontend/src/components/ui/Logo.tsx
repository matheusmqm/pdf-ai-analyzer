import { APP_NAME, cn } from '@/lib/utils'

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <img src="/favicon.svg" alt="" className="size-8" />
      <span className="font-display text-lg font-semibold tracking-tight">{APP_NAME}</span>
    </span>
  )
}
