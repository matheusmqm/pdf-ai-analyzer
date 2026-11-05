
import { cn } from '@/lib/utils'
import { Spinner } from './Spinner'




/** Button classes, so they can also be applied to a <Link>. */
export const buttonClass = (variant = 'primary', size = 'md', block = false) =>
  cn('sm-btn', `sm-btn--${variant}`, size !== 'md' && `sm-btn--${size}`, block && 'sm-btn--block')








export function Button({
  variant = 'primary',
  size = 'md',
  block,
  loading,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={cn(buttonClass(variant, size, block), className)}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}
