import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/** Resposta do assistente em Markdown (listas, negrito, tabelas). */
export function Answer({ text }) {
  return (
    <div className="sm-answer">
      <Markdown
        remarkPlugins={[remarkGfm]}
        components={{
          td: ({ children, style }) => {
            const isNumber = typeof children === 'string' && /^[-+]?[R$\s\d.,%]+$/.test(children.trim())
            return (
              <td style={style} className={isNumber ? 'is-num' : undefined}>
                {children}
              </td>
            )
          },
          table: ({ children }) => (
            <div className="sm-tablewrap">
              <table className="sm-table">{children}</table>
            </div>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer noopener">
              {children}
            </a>
          ),
        }}
      >
        {text}
      </Markdown>
    </div>
  )
}
