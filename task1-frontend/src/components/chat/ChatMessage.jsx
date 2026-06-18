import { processCitationsForMarkdown, getCitationClass } from '../../utils/citations'
import { User, Bot, Loader2 } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'

function CitedMarkdown({ content }) {
  // Pre-process citations into special markdown links
  const processedContent = processCitationsForMarkdown(content)

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="text-sm">{children}</li>,
        code: ({ inline, children }) =>
          inline
            ? <code className="bg-border/50 rounded px-1 py-0.5 font-mono text-xs text-accent">{children}</code>
            : <pre className="bg-bg border border-border rounded-lg p-3 overflow-x-auto my-2"><code className="font-mono text-xs">{children}</code></pre>,
        h1: ({ children }) => <h1 className="text-base font-bold mb-2">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mb-1.5">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
        a: ({ href, children }) => {
          // If this is one of our special citation links, render it as a badge!
          if (href && href.startsWith('#citation:')) {
            const [, type, refRaw] = href.split(':')
            const ref = decodeURIComponent(refRaw || '')
            
            // To make citations truly clickable (Change 3 request) without building a full PDF viewer:
            // We can make YouTube and URL citations clickable to Google Search, or just highlight them!
            const isClickable = type === 'youtube' || type === 'url'
            const searchUrl = isClickable 
               ? (type === 'youtube' ? `https://www.youtube.com/results?search_query=${ref}` : `https://www.google.com/search?q=${ref}`)
               : '#'

            return (
              <a
                href={searchUrl}
                target={isClickable ? "_blank" : undefined}
                rel="noopener noreferrer"
                className={clsx(
                  'inline-flex items-center mx-0.5 px-1.5 py-0.5 rounded text-xs font-mono no-underline transition-transform',
                  getCitationClass(type),
                  isClickable ? 'hover:scale-105 cursor-pointer' : 'cursor-default'
                )}
                title={`Source: ${type} — ${ref}`}
              >
                {children}
              </a>
            )
          }
          // Standard markdown links
          return <a href={href} className="text-accent hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>
        }
      }}
    >
      {processedContent}
    </ReactMarkdown>
  )
}

export default function ChatMessage({ message }) {
  const isUser = message.role === 'user'
  const isStreaming = message.streaming

  return (
    <div className={clsx('flex gap-3 animate-slide-up', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div
        className={clsx(
          'w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1',
          isUser ? 'bg-accent/20 text-accent' : 'bg-surface border border-border text-text-muted'
        )}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      <div
        className={clsx(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
          isUser
            ? 'bg-accent/20 text-text-primary rounded-tr-sm'
            : message.error
              ? 'bg-error/10 border border-error/20 text-error rounded-tl-sm'
              : 'bg-surface border border-border text-text-primary rounded-tl-sm'
        )}
      >
        {isUser ? (
          <span>{message.content}</span>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <CitedMarkdown content={message.content} />
            {isStreaming && (
              <span className="inline-flex items-center gap-1 ml-1 text-text-muted">
                <Loader2 size={12} className="animate-spin" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
