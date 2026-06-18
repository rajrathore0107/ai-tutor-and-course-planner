import { useState, useRef, useEffect } from 'react'
import { Send, HelpCircle, Loader2 } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import clsx from 'clsx'

export default function ChatInput() {
  const { sendMessage, chatLoading, sources, generateQuiz, quizLoading, setActiveTab } = useStore()
  const [text, setText] = useState('')
  const textareaRef = useRef()

  const hasSources = sources.length > 0

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || chatLoading || !hasSources) return
    setText('')
    await sendMessage(trimmed)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleQuiz = async () => {
    if (!hasSources || quizLoading) return
    await generateQuiz(5)
  }

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 160) + 'px'
  }, [text])

  return (
    <div className="border-t border-border p-4">
      {!hasSources && (
        <p className="text-xs text-text-muted text-center mb-3">
          Add a source from the sidebar to start chatting
        </p>
      )}
      <div className="flex gap-2 items-end">
        {/* Quiz Me button */}
        <button
          onClick={handleQuiz}
          disabled={!hasSources || quizLoading}
          title="Generate quiz from loaded sources"
          className={clsx(
            'flex-shrink-0 h-10 px-3 rounded-lg text-sm font-medium border transition-colors flex items-center gap-1.5',
            hasSources
              ? 'border-accent/50 text-accent hover:bg-accent/10'
              : 'border-border text-text-muted opacity-40 cursor-not-allowed'
          )}
        >
          {quizLoading ? <Loader2 size={14} className="animate-spin" /> : <HelpCircle size={14} />}
          <span className="hidden sm:inline">Quiz Me</span>
        </button>

        {/* Message input */}
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={hasSources ? 'Ask a question about your sources...' : 'Add sources first'}
            disabled={!hasSources || chatLoading}
            rows={1}
            className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || chatLoading || !hasSources}
            className="absolute right-2 bottom-2 w-8 h-8 rounded-lg bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {chatLoading
              ? <Loader2 size={14} className="text-white animate-spin" />
              : <Send size={14} className="text-white" />
            }
          </button>
        </div>
      </div>
    </div>
  )
}
