import ChatPanel from './components/chat/ChatPanel'
import PlannerPanel from './components/planner/PlannerPanel'

export default function App() {
  return (
    <div className="h-screen flex bg-bg text-text-primary overflow-hidden">
      {/* Left — Chat */}
      <div className="w-[420px] flex-shrink-0 border-r border-border flex flex-col overflow-hidden">
        <ChatPanel />
      </div>

      {/* Right — Live Plan Preview */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <PlannerPanel />
      </div>
    </div>
  )
}
