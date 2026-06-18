import { useEffect, useRef, useState } from 'react'
import { Send, Loader2, Upload, GraduationCap, AlertCircle } from 'lucide-react'
import { useStore, PHASE } from '../../stores/useStore'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import clsx from 'clsx'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={clsx('flex gap-3 animate-slide-up', isUser ? 'flex-row-reverse' : 'flex-row')}>
      <div className={clsx(
        'w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-1 text-xs font-bold',
        isUser ? 'bg-accent/20 text-accent' : 'bg-accent text-white'
      )}>
        {isUser ? 'M' : 'E'}
      </div>
      <div className={clsx(
        'max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed',
        isUser
          ? 'bg-accent/15 text-text-primary rounded-tr-sm'
          : msg.error
            ? 'bg-error/10 border border-error/20 text-error rounded-tl-sm'
            : 'bg-surface border border-border text-text-primary rounded-tl-sm'
      )}>
        {isUser ? (
          <span>{msg.content}</span>
        ) : (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                strong: ({ children }) => <strong className="font-semibold text-text-primary">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
            {msg.streaming && (
              <Loader2 size={12} className="inline ml-2 animate-spin text-text-muted" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatPanel() {
  const { messages, chatLoading, phase, planLoading, sendMessage, initSession, sessionId, importSyllabus } = useStore()
  const [text, setText] = useState('')
  const [syllabusError, setSyllabusError] = useState('')
  const messagesEndRef = useRef()
  const textareaRef = useRef()
  const fileInputRef = useRef()

  useEffect(() => {
    if (!sessionId) initSession()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 140) + 'px'
  }, [text])

  const handleSubmit = async (e) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || chatLoading || planLoading) return
    setText('')
    await sendMessage(trimmed)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit() }
  }

  const handleSyllabus = async (e) => {
    setSyllabusError('')
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.name.endsWith('.pdf')) { setSyllabusError('Only PDF files supported'); return }
    try {
      await importSyllabus(file)
    } catch (err) {
      setSyllabusError(err.message)
    }
    e.target.value = ''
  }

  const isDisabled = chatLoading || planLoading
  const phaseLabel = {
    [PHASE.IDLE]: '',
    [PHASE.INTAKE]: 'Gathering requirements',
    [PHASE.GENERATING]: 'Generating plan...',
    [PHASE.REFINING]: 'Refining mode',
  }[phase]

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <GraduationCap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold text-text-primary">EduPlan</p>
            <p className="text-xs text-text-muted">{phaseLabel}</p>
          </div>
        </div>
        <div>
          <input ref={fileInputRef} type="file" accept=".pdf" className="hidden" onChange={handleSyllabus} />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDisabled}
            className="flex items-center gap-1.5 text-xs text-text-muted hover:text-accent border border-border hover:border-accent/50 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40"
          >
            <Upload size={12} />
            Import Syllabus
          </button>
        </div>
      </div>

      {syllabusError && (
        <div className="mx-4 mt-3 flex items-center gap-2 text-xs text-error bg-error/10 border border-error/20 rounded-lg p-2.5">
          <AlertCircle size={12} /> {syllabusError}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-4">
        {messages.map((msg) => (
          <Message key={msg.id} msg={msg} />
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border p-4 flex-shrink-0">
        {phase === PHASE.GENERATING ? (
          <div className="flex items-center justify-center gap-2 py-3 text-sm text-text-muted">
            <Loader2 size={16} className="animate-spin text-accent" />
            Building your course plan...
          </div>
        ) : (
          <div className="flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKey}
              rows={1}
              disabled={isDisabled}
              placeholder={phase === PHASE.REFINING ? 'Ask to refine the plan...' : 'Reply to EduPlan...'}
              className="flex-1 bg-surface border border-border rounded-xl px-4 py-2.5 pr-12 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent resize-none transition-colors disabled:opacity-50"
            />
            <button
              onClick={handleSubmit}
              disabled={!text.trim() || isDisabled}
              className="w-10 h-10 rounded-xl bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
            >
              {chatLoading
                ? <Loader2 size={15} className="text-white animate-spin" />
                : <Send size={15} className="text-white" />
              }
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
