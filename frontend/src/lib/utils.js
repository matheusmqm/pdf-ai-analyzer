import clsx, { } from 'clsx'

export const cn = (...inputs) => clsx(inputs)

export const APP_NAME = 'SecondMind'

/** Backend limit (MAX_UPLOAD_MB). */
export const MAX_UPLOAD_MB = 20

// "Oct 28" (short date).
const dateFormat = new Intl.DateTimeFormat('en-US', { day: 'numeric', month: 'short' })
const dateYearFormat = new Intl.DateTimeFormat('en-US', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const sameYear = date.getFullYear() === new Date().getFullYear()
  return (sameYear ? dateFormat : dateYearFormat).format(date)
}

// "2.4 MB".
export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  const units = ['KB', 'MB', 'GB']
  let value = bytes / 1024
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit++
  }
  return `${value.toLocaleString('en-US', { maximumFractionDigits: value < 10 ? 1 : 0 })} ${units[unit]}`
}

export function errorMessage(error) {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}

export function fileExtension(name) {
  const dot = name.lastIndexOf('.')
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : ''
}
