import { create } from 'zustand'

const API = '/api/task2'

export const PHASE = {
  IDLE: 'idle',
  INTAKE: 'intake',
  GENERATING: 'generating',
  REFINING: 'refining',
}

export const useStore = create((set, get) => ({
  sessionId: null,
  phase: PHASE.IDLE,
  messages: [],
  chatLoading: false,
  collectedInfo: {},
  coursePlan: null,
  planLoading: false,

  initSession: async () => {
    const res = await fetch(`${API}/session`, { method: 'POST' })
    const data = await res.json()
    set({ sessionId: data.session_id, phase: PHASE.INTAKE })
    const welcome = {
      id: Date.now(),
      role: 'assistant',
      content: `Hi! I'm EduPlan, your AI curriculum designer. 👋\n\nI'll help you build a complete, structured course plan through a quick conversation.\n\nLet's start — **what subject or topic would you like to create a course for?**`,
      streaming: false,
    }
    set({ messages: [welcome] })
  },

  sendMessage: async (text) => {
    const { sessionId, phase, messages, collectedInfo, coursePlan } = get()

    const userMsg = { id: Date.now(), role: 'user', content: text }
    const assistantMsgId = Date.now() + 1
    const assistantMsg = { id: assistantMsgId, role: 'assistant', content: '', streaming: true }

    set((s) => ({
      messages: [...s.messages, userMsg, assistantMsg],
      chatLoading: true,
    }))

    const history = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [m.content],
    }))

    const endpoint = phase === PHASE.REFINING ? `${API}/refine` : `${API}/intake`
    const body = phase === PHASE.REFINING
      ? { session_id: sessionId, message: text, current_plan: coursePlan, history }
      : { session_id: sessionId, message: text, history, collected_info: collectedInfo }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

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
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6).trim()
          if (data === '[DONE]') break
          try {
            const parsed = JSON.parse(data)
            if (parsed.token) {
              fullContent += parsed.token
              // Show content without the signal tag
              const displayContent = fullContent
                .replace('[INTAKE_COMPLETE]', '')
                .replace('[NO_UPDATE]', '')
                .trim()
              set((s) => ({
                messages: s.messages.map((m) =>
                  m.id === assistantMsgId ? { ...m, content: displayContent } : m
                ),
              }))
            }
          } catch {}
        }
      }

      // Mark streaming done
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsgId ? { ...m, streaming: false } : m
        ),
        chatLoading: false,
      }))

      // Check signals on full content AFTER streaming completes
      if (phase === PHASE.INTAKE && fullContent.includes('[INTAKE_COMPLETE]')) {
        // Extract collected info from conversation
        const conversationText = [...messages, userMsg]
          .map((m) => `${m.role}: ${m.content}`)
          .join('\n')
        set({ collectedInfo: { conversation_summary: conversationText } })
        await get().generatePlan()
        return
      }

      if (phase === PHASE.REFINING && fullContent.includes('[NO_UPDATE]')) {
        return
      }

      // In refining phase, try to parse updated JSON plan from response
      if (phase === PHASE.REFINING) {
        try {
          // Look for JSON object in the response
          const jsonMatch = fullContent.match(/\{[\s\S]*"modules"[\s\S]*\}/)
          if (jsonMatch) {
            const updatedPlan = JSON.parse(jsonMatch[0])
            set({ coursePlan: updatedPlan })
            set((s) => ({
              messages: s.messages.map((m) =>
                m.id === assistantMsgId
                  ? { ...m, content: '✅ Course plan updated! You can see the changes in the preview panel.' }
                  : m
              ),
            }))
          }
        } catch {}
      }

    } catch (err) {
      set((s) => ({
        messages: s.messages.map((m) =>
          m.id === assistantMsgId
            ? { ...m, content: `Error: ${err.message}`, streaming: false, error: true }
            : m
        ),
        chatLoading: false,
      }))
    }
  },

  generatePlan: async () => {
    const { sessionId, collectedInfo, messages } = get()

    const conversationText = messages.map((m) => `${m.role}: ${m.content}`).join('\n')
    const intake = Object.keys(collectedInfo).length > 0
      ? collectedInfo
      : { conversation_summary: conversationText }

    set({ phase: PHASE.GENERATING, planLoading: true })

    const genMsgId = Date.now()
    const genMsg = {
      id: genMsgId,
      role: 'assistant',
      content: '✨ Perfect! I have everything I need. Generating your complete course plan now — this takes about 15 seconds...',
      streaming: false,
    }
    set((s) => ({ messages: [...s.messages, genMsg] }))

    try {
      const res = await fetch(`${API}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, intake_info: intake, num_modules: 5 }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Plan generation failed')
      }

      const plan = await res.json()
      set({ coursePlan: plan, phase: PHASE.REFINING, planLoading: false })

      const doneMsg = {
        id: Date.now(),
        role: 'assistant',
        content: `🎉 Your course plan is ready! I've created **${plan.modules?.length || 0} modules** for **"${plan.title}"**.\n\nIn the preview panel you can:\n- **Click any field** to edit it directly\n- **Ask me to refine** anything ("make module 2 simpler", "add a project")\n- **Export** the final plan as JSON`,
        streaming: false,
      }
      set((s) => ({
        messages: [...s.messages.filter((m) => m.id !== genMsgId), doneMsg],
      }))

    } catch (err) {
      set({ phase: PHASE.INTAKE, planLoading: false })
      const errMsg = {
        id: Date.now(),
        role: 'assistant',
        content: `Sorry, plan generation failed: ${err.message}. Please try again.`,
        streaming: false,
        error: true,
      }
      set((s) => ({
        messages: [...s.messages.filter((m) => m.id !== genMsgId), errMsg],
      }))
    }
  },

  updatePlanField: (path, value) => {
    const plan = JSON.parse(JSON.stringify(get().coursePlan))
    const keys = path.split('.')
    let target = plan
    for (let i = 0; i < keys.length - 1; i++) {
      target = target[keys[i]]
    }
    target[keys[keys.length - 1]] = value
    set({ coursePlan: plan })
  },

  setPlan: (plan) => set({ coursePlan: plan }),

  exportPlan: () => {
    const { coursePlan } = get()
    if (!coursePlan) return
    const blob = new Blob([JSON.stringify(coursePlan, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${coursePlan.title?.replace(/\s+/g, '-').toLowerCase() || 'course-plan'}.json`
    a.click()
    URL.revokeObjectURL(url)
  },

  importSyllabus: async (file) => {
    set({ planLoading: true })
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await fetch(`${API}/import-syllabus`, { method: 'POST', body: form })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.detail || 'Syllabus import failed')
      }
      const plan = await res.json()
      set({ coursePlan: plan, phase: PHASE.REFINING, planLoading: false })

      const msg = {
        id: Date.now(),
        role: 'assistant',
        content: `📄 Syllabus imported and restructured successfully! Your course plan is now in the preview panel. Feel free to ask me to adjust anything.`,
        streaming: false,
      }
      set((s) => ({ messages: [...s.messages, msg] }))
    } catch (err) {
      set({ planLoading: false })
      throw err
    }
  },

  setCollectedInfo: (info) => set({ collectedInfo: info }),
}))
