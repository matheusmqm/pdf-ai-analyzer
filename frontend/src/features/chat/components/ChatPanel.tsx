import { ArrowUp, Sparkles, Trash2 } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from 'react'
import { ErrorAlert } from '@/components/ui/Alert'
import { useDocumentChat } from '../useDocumentChat'
import { PendingBubble } from './PendingBubble'

const SUGGESTIONS = [
  'Faça um resumo deste documento',
  'Quais são os pontos principais?',
  'Existem datas ou valores importantes?',
]

export function ChatPanel({ documentId }: { documentId: string }) {
  const { messages, pending, ask, clear } = useDocumentChat(documentId)
  const [text, setText] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  const submit = (question: string) => {
    const trimmed = question.trim()
    if (!trimmed || pending) return
    setText('')
    void ask(trimmed)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    submit(text)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      submit(text)
    }
  }

  return (
    <section
      aria-label="Perguntas sobre o documento"
      className="flex min-h-[28rem] flex-col overflow-hidden rounded-2xl border border-line bg-surface/80 backdrop-blur"
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-display font-medium">
          <Sparkles className="size-4 text-accent-soft" />
          Pergunte ao documento
        </h2>
        {messages.length > 0 && !pending && (
          <button
            type="button"
            onClick={clear}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1 text-xs text-muted transition hover:bg-white/8 hover:text-fg"
          >
            <Trash2 className="size-3.5" />
            Limpar
          </button>
        )}
      </div>

      <div className="flex-1 space-y-6 overflow-y-auto px-4 py-5" aria-live="polite">
        {messages.length === 0 && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="max-w-xs text-muted">
              Faça uma pergunta e a resposta será baseada apenas no conteúdo do PDF.
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => submit(suggestion)}
                  className="cursor-pointer rounded-full border border-line bg-white/4 px-3.5 py-1.5 text-sm text-muted transition hover:border-accent/50 hover:text-fg"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className="space-y-3">
            <div className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-linear-to-br from-accent to-[#6b4df0] px-4 py-2.5 text-sm text-white">
              {message.question}
            </div>
            <div className="max-w-[92%]">
              {message.status === 'pending' && <PendingBubble />}
              {message.status === 'error' && <ErrorAlert>{message.error}</ErrorAlert>}
              {message.status === 'done' && (
                <p className="whitespace-pre-wrap text-[15px] leading-relaxed">{message.answer}</p>
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} />
      </div>

      <form onSubmit={onSubmit} className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-2xl border border-line bg-white/4 p-2 transition focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20">
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder={pending ? 'Aguardando a resposta…' : 'Escreva sua pergunta'}
            disabled={pending}
            aria-label="Sua pergunta"
            className="max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted/60 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            aria-label="Enviar pergunta"
            className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-xl bg-linear-to-br from-accent to-[#6b4df0] text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowUp className="size-4" />
          </button>
        </div>
      </form>
    </section>
  )
}
