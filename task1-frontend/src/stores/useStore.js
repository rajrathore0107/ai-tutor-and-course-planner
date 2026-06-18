import { create } from 'zustand'

const API = '/api/task1'

export const useStore = create((set, get) => ({
  sessionId: null,
  sessionLoading: false,
  sources: [],
  sourcesLoading: false,
  messages: [],
  chatLoading: false,
  quiz: null,
  quizLoading: false,
  activeTab: 'chat',

  initSession: async () => {
    set({ sessionLoading: true })
    const res = await fetch(`${API}/session`, { method: 'POST' })
    const data = await res.json()
    set({ sessionId: data.session_id, sessionLoading: false })
    return data.session_id
  },

  // Remove a source from the list (client-side only — ChromaDB is in-memory per session)
  removeSource: (sourceId) => {
    set((s) => ({ sources: s.sources.filter((src) => src.source_id !== sourceId) }))
  },

  ingestFile: async (file) => {
    const { sessionId } = get()
    const ext = file.name.split('.').pop().toLowerCase()
    const endpoint = ext === 'pdf' ? 'pdf' : 'pptx'
    const form = new FormData()
    form.append('session_id', sessionId)
    form.append('file', file)
    set({ sourcesLoading: true })
    try {
      const res = await fetch(`${API}/ingest/${endpoint}`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Upload failed')
      }
      const source = await res.json()
      set((s) => ({ sources: [...s.sources, source] }))
      return source
    } finally {
      set({ sourcesLoading: false })
    }
  },

  ingestUrl: async (url) => {
    const { sessionId } = get()
    const isYoutube = url.includes('youtube.com') || url.includes('youtu.be')
    set({ sourcesLoading: true })
    try {
      const res = await fetch(`${API}/ingest/url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          url,
          source_type: isYoutube ? 'youtube' : 'url',
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'URL ingestion failed')
      }
      const source = await res.json()
      set((s) => ({ sources: [...s.sources, source] }))
      return source
    } finally {
      set({ sourcesLoading: false })
    }
  },

  sendMessage: async (text) => {
    const { sessionId, messages } = get()
    const userMsg = { id: Date.now(), role: 'user', content: text }
    const assistantMsg = { id: Date.now() + 1, role: 'assistant', content: '', streaming: true }
    set((s) => ({ messages: [...s.messages, userMsg, assistantMsg], chatLoading: true }))

    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [m.content],
    }))

    try {
      const res = await fetch(`${API}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, message: text, history }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail)
      }
      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let fullContent = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop()
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') break
            try {
              const parsed = JSON.parse(data)
              if (parsed.token) {
                fullContent += parsed.token
                set((s) => ({
                  messages: s.messages.map((m) =>
                    m.id === assistantMsg.id ? { ...m, content: fullContent } : m
                  ),
                }))
              }
            } catch {}
          }
        }
      }
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsg.id ? { ...m, streaming: false } : m
        ),
        chatLoading: false,
      }))
    } catch (err) {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: `Error: ${err.message}`, streaming: false, error: true }
            : m
        ),
        chatLoading: false,
      }))
    }
  },

  generateQuiz: async (numQuestions = 5) => {
    const { sessionId } = get()
    set({ quizLoading: true, quiz: null })
    try {
      const res = await fetch(`${API}/quiz`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, num_questions: numQuestions }),
      })
      if (!res.ok) throw new Error('Quiz generation failed')
      const data = await res.json()
      set({ quiz: data, quizLoading: false, activeTab: 'quiz' })
    } catch (err) {
      set({ quizLoading: false })
      throw err
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  clearQuiz: () => set({ quiz: null, activeTab: 'chat' }),
}))
