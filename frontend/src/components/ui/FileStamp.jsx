import { cn } from '@/lib/utils'



// O tipo é dito pela extensão escrita, num carimbo de tinta. Sem cor por tipo.
export function FileStamp({ ext, size = 'sm', className }) {
  return (
    <span
      className={cn('sm-stamp', size === 'tile' && 'sm-stamp--tile', size === 'xl' && 'sm-stamp--xl', className)}
      aria-label={`Arquivo ${ext.toUpperCase()}`}
    >
      {ext}
    </span>
  )
}
