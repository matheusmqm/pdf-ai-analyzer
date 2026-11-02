import { useId, } from 'react'
import { cn } from '@/lib/utils'



export function Field({ label, hint, className, id, ...rest }) {
  const auto = useId()
  const inputId = id ?? auto
  return (
    <div className="sm-field">
      <label htmlFor={inputId}>{label}</label>
      <input id={inputId} className={cn('sm-input', className)} {...rest} />
      {hint}
    </div>
  )
}
