import { CircleAlert, CircleCheck } from 'lucide-react'

import { cn } from '@/lib/utils'



// Status sempre com ícone e palavra (nunca só cor).
export function Alert({ children, tone = 'danger', className }) {
  const Icon = tone === 'danger' ? CircleAlert : CircleCheck
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('sm-alert', `sm-alert--${tone}`, className)}>
      <Icon className="sm-ico" aria-hidden />
      <div>{children}</div>
    </div>
  )
}

export const ErrorAlert = ({ children, className }) => (
  <Alert tone="danger" className={className}>
    {children}
  </Alert>
)
