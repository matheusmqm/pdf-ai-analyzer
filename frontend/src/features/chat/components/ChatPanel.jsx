import { ArrowUp, Eraser } from 'lucide-react'
import { useEffect, useRef, useState, } from 'react'
import { Note } from '@/components/ui/Scribble'
import { useChat } from '../useChat'
import { ChatTurn } from './ChatTurn'

const SUGGESTIONS = ['Resuma este PDF', 'Quais são os pontos principais?', 'Quais números aparecem aqui?']

export function ChatPanel({ documentId }) {
  const chat = useChat(documentId)
  const [text, setText] = useState('')
  const body = useRef(null)
  const area = useRef(null)
  const stick = useRef(true)

  const last = chat.messages[chat.messages.length - 1]

  // Acompanha o fim da conversa, a menos que a pessoa tenha rolado para cima.
  useEffect(() => {
    const el = body.current
    if (el && stick.current) el.scrollTop = el.scrollHeight
  }, [chat.messages.length, last?.status])

  // Altura do campo cresce com o texto, até 128px.
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
    <section className="sm-chat" aria-label="Pergunte a este PDF">
      <div className="sm-chat-head">
        <div className="min-w-0">
          <h2 className="sm-chat-title">Pergunte a este PDF</h2>
          <Note className="block truncate">a resposta vem só do texto dele</Note>
        </div>
        {chat.messages.length > 0 && (
          <button
            type="button"
            className="sm-iconbtn"
            aria-label="Limpar a conversa"
            title="Limpar a conversa"
            onClick={chat.clear}
          >
            <Eraser className="sm-ico" aria-hidden />
          </button>
        )}
      </div>

      <div
        ref={body}
        className="sm-chat-body sm-ruled sm-ruled--margin"
        onScroll={(event) => {
          const el = event.currentTarget
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
        }}
        aria-live="polite"
      >
        {chat.messages.length === 0 && (
          <>
            <p className="sm-msg-user" style={{ color: 'var(--ink-muted)' }}>
              o que você quer saber sobre ele?
            </p>
            <div className="sm-refs" aria-label="Sugestões">
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
            placeholder="Pergunte sobre este PDF"
            aria-label="Sua pergunta"
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKey}
          />
          <button
            type="button"
            className="sm-send"
            aria-label="Enviar pergunta"
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
