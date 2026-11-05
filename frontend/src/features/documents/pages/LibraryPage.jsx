import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { Library } from '../components/Library'

export default function LibraryPage() {
  return (
    <div className="sm-rise">
      <header className="sm-pagehead">
        <h1 className="display-lg">Documents</h1>
        <p className="body-lg">Upload PDF files and ask questions about the content of all of them at once.</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-2" style={{ alignItems: 'start' }}>
        <Library />
        <div className="sm-sticky">
          <ChatPanel />
        </div>
      </div>
    </div>
  )
}
