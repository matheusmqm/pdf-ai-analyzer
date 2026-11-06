import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { ErrorAlert } from '@/components/ui/Alert'
import { Spinner } from '@/components/ui/Spinner'
import { errorMessage } from '@/lib/utils'
import { getPreview } from '../api'

const cell = (value) => {
  if (value === null || value === undefined) return ''
  if (typeof value === 'number') return value.toLocaleString('en-US', { maximumFractionDigits: 4 })
  return String(value)
}

// Read-only preview of a spreadsheet: one tab per sheet, first rows only.
export function SheetViewer({ documentId }) {
  const preview = useQuery({
    queryKey: ['preview', documentId],
    queryFn: () => getPreview(documentId),
    staleTime: 5 * 60 * 1000,
  })
  const [active, setActive] = useState(0)

  if (preview.isPending) {
    return (
      <div className="sm-sheet grid place-items-center" role="status" style={{ minHeight: 240 }}>
        <Spinner />
      </div>
    )
  }
  if (preview.isError) return <ErrorAlert>{errorMessage(preview.error)}</ErrorAlert>

  const sheets = preview.data.sheets
  const sheet = sheets[Math.min(active, sheets.length - 1)]

  return (
    <div className="sm-sheet" style={{ padding: 'var(--space-4)' }}>
      {sheets.length > 1 && (
        <div className="sm-refs" role="tablist" aria-label="Sheets">
          {sheets.map((item, index) => (
            <button
              key={item.name}
              type="button"
              role="tab"
              aria-selected={index === active}
              className="sm-sugg"
              style={index === active ? { background: 'var(--paper-sunken)', color: 'var(--ink)' } : undefined}
              onClick={() => setActive(index)}
            >
              {item.name}
            </button>
          ))}
        </div>
      )}

      <div className="sm-tablewrap" style={{ maxHeight: '65vh', overflow: 'auto' }}>
        <table className="sm-table">
          <thead>
            <tr>
              {sheet.columns.map((column) => (
                <th key={column}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sheet.rows.map((row, index) => (
              <tr key={index}>
                {row.map((value, i) => (
                  <td key={i} className={typeof value === 'number' ? 'is-num' : undefined}>
                    {cell(value)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="sm-meta-note" style={{ margin: 'var(--space-2) 0 0' }}>
        Showing {sheet.rows.length.toLocaleString('en-US')} of {sheet.total_rows.toLocaleString('en-US')} rows. Column
        names are normalized (lowercase, no accents) so they can be used in queries.
      </p>
    </div>
  )
}
