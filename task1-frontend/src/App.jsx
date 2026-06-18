import { useEffect, useRef } from 'react'
import { MessageSquare, HelpCircle, BookOpen } from 'lucide-react'
import { useStore } from './stores/useStore'
import SourcePanel from './components/sources/SourcePanel'
import ChatMessage from './components/chat/ChatMessage'
import ChatInput from './components/chat/ChatInput'
import QuizPanel from './components/quiz/QuizPanel'
import clsx from 'clsx'

function EmptyState() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
        <BookOpen size={28} className="text-accent" />
      </div>
      <div>
        <p className="text-text-primary font-semibold">Ready to learn</p>
        <p className="text-sm text-text-muted mt-1 leading-relaxed max-w-xs">
          Add a PDF, PowerPoint, YouTube video, or webpage from the sidebar, then ask anything about it.
        </p>
      </div>
      <div className="flex flex-wrap gap-2 justify-center mt-2">
        {['What is this about?', 'Summarize the key points', 'Explain this simply', 'Quiz me'].map((s) => (
          <span key={s} className="text-xs bg-surface border border-border rounded-full px-3 py-1 text-text-muted">
            {s}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const { sessionId, initSession, messages, activeTab, setActiveTab, quiz } = useStore()
  const messagesEndRef = useRef()

  useEffect(() => {
    if (!sessionId) initSession()
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  return (
    <div className="h-screen flex flex-col bg-bg text-text-primary overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
            <BookOpen size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary">EduAssist</h1>
            <p className="text-xs text-text-muted">AI Learning Assistant</p>
          </div>
        </div>

        {/* Tabs — only show when quiz is available */}
        {quiz && (
          <div className="flex bg-surface rounded-lg p-1 border border-border">
            {[
              { id: 'chat', icon: MessageSquare, label: 'Chat' },
              { id: 'quiz', icon: HelpCircle, label: 'Quiz' },
            ].map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={clsx(
                  'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                  activeTab === id
                    ? 'bg-accent text-white'
                    : 'text-text-muted hover:text-text-primary'
                )}
              >
                <Icon size={12} />
                {label}
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside className="w-72 border-r border-border flex-shrink-0 overflow-hidden flex flex-col">
          <SourcePanel />
        </aside>

        {/* Main content */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {activeTab === 'quiz' && quiz ? (
            <QuizPanel />
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
                {messages.length === 0 ? (
                  <EmptyState />
                ) : (
                  messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <ChatInput />
            </>
          )}
        </main>
      </div>
    </div>
  )
}
