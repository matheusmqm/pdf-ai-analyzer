import { cn } from '@/lib/utils'



// The file type shows up as a stamp with its extension. No color per type.
export function FileStamp({ ext, size = 'sm', className }) {
  return (
    <span
      className={cn('sm-stamp', size === 'tile' && 'sm-stamp--tile', size === 'xl' && 'sm-stamp--xl', className)}
      aria-label={`${ext.toUpperCase()} file`}
    >
      {ext}
    </span>
  )
}
