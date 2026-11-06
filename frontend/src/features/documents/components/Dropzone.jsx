import { CircleCheck, CircleX, Upload, X } from 'lucide-react'
import { useRef, useState, } from 'react'
import { ErrorAlert } from '@/components/ui/Alert'
import { FileStamp } from '@/components/ui/FileStamp'
import { Spinner } from '@/components/ui/Spinner'
import { cn, fileExtension, MAX_UPLOAD_MB } from '@/lib/utils'
import { ACCEPT_ATTR, useUploadQueue } from '../useDocuments'



export function Dropzone({ compact = false }) {
  const queue = useUploadQueue()
  const input = useRef(null)
  const [over, setOver] = useState(false)

  const pick = (files) => {
    if (files && files.length) queue.add(Array.from(files))
  }
  const onDrop = (event) => {
    event.preventDefault()
    setOver(false)
    pick(event.dataTransfer.files)
  }
  const onKey = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      input.current?.click()
    }
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload files (PDF, Excel or CSV): drag them here or click to choose"
        className={cn('sm-drop', compact && 'sm-drop--compact', over && 'is-over')}
        onClick={() => input.current?.click()}
        onKeyDown={onKey}
        onDragOver={(event) => {
          event.preventDefault()
          setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <span className="sm-drop-icon" aria-hidden>
          <Upload className="sm-ico" />
        </span>
        <div className="sm-drop-text" style={{ display: 'flex', flexDirection: 'column', alignItems: compact ? 'flex-start' : 'center', gap: 8 }}>
          <p className="sm-drop-title">
            {over ? 'Drop the files to upload' : 'Drag PDF, Excel or CSV files here or click to select'}
          </p>
          <div className="sm-row" style={{ margin: 0, justifyContent: compact ? 'flex-start' : 'center' }}>
            <FileStamp ext="pdf" />
            <FileStamp ext="xlsx" />
            <FileStamp ext="csv" />
          </div>
          {!compact && (
            <p className="sm-drop-hint">
              PDF, Excel (.xlsx) or CSV, up to {MAX_UPLOAD_MB} MB per file. You can upload several at once.
            </p>
          )}
        </div>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT_ATTR}
          hidden
          onChange={(event) => {
            pick(event.target.files)
            event.target.value = '' // lets the same file be picked again
          }}
        />
      </div>

      {queue.rejected.length > 0 && (
        <div className="mt-3">
          <ErrorAlert>
            <ul className="m-0 list-none space-y-1 p-0">
              {queue.rejected.map((message) => (
                <li key={message}>{message}</li>
              ))}
            </ul>
            <button type="button" className="sm-link mt-1" onClick={queue.clearRejected}>
              Dismiss
            </button>
          </ErrorAlert>
        </div>
      )}

      {queue.items.length > 0 && (
        <ul className="m-0 mt-3 list-none space-y-2 p-0" aria-label="Uploads in progress">
          {queue.items.map((item) => (
            <li
              key={item.id}
              className="sm-rise flex items-center gap-3 rounded-lg border border-line bg-paper-raised px-3 py-2"
            >
              <FileStamp ext={fileExtension(item.name)} />
              <span className="min-w-0 flex-1 truncate text-[14px]">{item.name}</span>
              {item.status === 'uploading' && (
                <span className="flex items-center gap-2 text-[13px] text-ink-muted" role="status">
                  <Spinner /> Uploading…
                </span>
              )}
              {item.status === 'done' && (
                <span className="sm-status sm-status--ok">
                  <CircleCheck className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden /> Uploaded
                </span>
              )}
              {item.status === 'error' && (
                <>
                  <span className="sm-status sm-status--bad" title={item.error}>
                    <CircleX className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
                    <span className="max-w-[16rem] truncate">{item.error}</span>
                  </span>
                  <button
                    type="button"
                    className="sm-iconbtn"
                    style={{ width: 28, height: 28 }}
                    aria-label={`Dismiss notice for ${item.name}`}
                    onClick={() => queue.dismiss(item.id)}
                  >
                    <X className="sm-ico" style={{ width: 16, height: 16 }} aria-hidden />
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
