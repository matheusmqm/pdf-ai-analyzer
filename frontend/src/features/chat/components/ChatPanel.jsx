import { ArrowUp, Eraser } from 'lucide-react'
import { useEffect, useRef, useState, } from 'react'
import { useChat } from '../useChat'
import { ChatTurn } from './ChatTurn'

const SUGGESTIONS = [
  'What topics do the documents cover?',
  'Summarize the main points',
  'Do the figures in the reports match the spreadsheets?',
]

export function ChatPanel() {
  const chat = useChat()
  const [text, setText] = useState('')
  const body = useRef(null)
  const area = useRef(null)
  const stick = useRef(true)

  const last = chat.messages[chat.messages.length - 1]

  // Follow the end of the conversation, unless the user has scrolled up.
  useEffect(() => {
    const el = body.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [chat.messages.length, last?.status])

  // Field height grows with the text, up to 128px.
  useEffect(() => {
    const el = area.current
    if (!el) return
    el.style.height = '40px'
    if (text) el.style.height = `${Math.min(el.scrollHeight, 128)}px`
  }, [text])

  const send = (question = text) => {
    const clean = question.trim()
    if (!clean || chat.pending) return
    setText('')
    stick.current = true
    void chat.ask(clean)
  }
  const onKey = (event) => {
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault()
      send()
    }
  }

  return (
    <section className="sm-chat" aria-label="Questions about the documents">
      <div className="sm-chat-head">
        <div className="min-w-0">
          <h2 className="sm-chat-title">Ask your documents</h2>
          <span className="sm-chat-sub truncate">Answers from your PDFs and spreadsheets, with the source of each number</span>
        </div>
        {chat.messages.length > 0 && (
          <button
            type="button"
            className="sm-iconbtn"
            aria-label="Clear the conversation"
            title="Clear the conversation"
            onClick={chat.clear}
          >
            <Eraser className="sm-ico" aria-hidden />
          </button>
        )}
      </div>

      <div
        ref={body}
        className="sm-chat-body"
        onScroll={(event) => {
          const el = event.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        aria-live="polite"
      >
        {chat.messages.length === 0 && (
          <>
            <p className="sm-msg-hint">Ask about any file in your base or pick a suggestion:</p>
            <div className="sm-refs" aria-label="Suggestions">
              {SUGGESTIONS.map((suggestion) => (
                <button key={suggestion} type="button" className="sm-sugg" onClick={() => send(suggestion)}>
                  {suggestion}
                </button>
              ))}
            </div>
          </>
        )}

        {chat.messages.map((message) => (
          <ChatTurn key={message.id} message={message} onRetry={chat.retry} />
        ))}
      </div>

      <div className="sm-chat-foot">
        <div className="sm-composer">
          <textarea
            ref={area}
            rows={1}
            value={text}
            placeholder="Type your question"
            aria-label="Your question"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKey}
          />
          <button
            type="button"
            className="sm-send"
            aria-label="Send question"
            disabled={!text.trim() || chat.pending}
            onClick={() => send()}
          >
            <ArrowUp className="sm-ico" aria-hidden />
          </button>
        </div>
      </div>
    </section>
  )
}
