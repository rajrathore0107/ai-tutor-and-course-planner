import { Download, Loader2, BookOpen, Users, Clock, Target } from 'lucide-react'
import { useStore, PHASE } from '../../stores/useStore'
import ModuleCard from './ModuleCard'
import EditableField from './EditableField'
import DifficultyPill from './DifficultyPill'
import clsx from 'clsx'

function EmptyPlanner({ phase }) {
  const steps = [
    { n: 1, label: 'Tell EduPlan your subject', done: phase !== PHASE.IDLE },
    { n: 2, label: 'Answer a few quick questions', done: phase === PHASE.GENERATING || phase === PHASE.REFINING },
    { n: 3, label: 'Review & edit your course plan', done: phase === PHASE.REFINING },
  ]

  return (
    <div className="flex flex-col items-center justify-center h-full gap-8 p-10 text-center">
      <div className="w-16 h-16 rounded-2xl bg-accent/10 border border-accent/20 flex items-center justify-center">
        <BookOpen size={28} className="text-accent" />
      </div>
      <div>
        <p className="text-text-primary font-semibold text-lg">Course plan will appear here</p>
        <p className="text-sm text-text-muted mt-1">Complete the conversation on the left to generate</p>
      </div>
      <div className="flex flex-col gap-3 w-full max-w-xs">
        {steps.map((s) => (
          <div key={s.n} className="flex items-center gap-3 text-left">
            <div className={clsx(
              'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
              s.done ? 'bg-success/20 text-success' : 'bg-border text-text-muted'
            )}>
              {s.done ? '✓' : s.n}
            </div>
            <span className={clsx('text-sm', s.done ? 'text-text-primary' : 'text-text-muted')}>
              {s.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function GeneratingState() {
  return (
    <div className="flex flex-col items-center justify-center h-full gap-4">
      <Loader2 size={36} className="text-accent animate-spin" />
      <div className="text-center">
        <p className="text-text-primary font-semibold">Building your course plan</p>
        <p className="text-sm text-text-muted mt-1">Generating modules, lessons & resources...</p>
      </div>
      <div className="flex gap-1 mt-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-2 h-2 rounded-full bg-accent animate-bounce"
            style={{ animationDelay: `${i * 150}ms` }}
          />
        ))}
      </div>
    </div>
  )
}

export default function PlannerPanel() {
  const { coursePlan, planLoading, phase, exportPlan, updatePlanField } = useStore()

  if (planLoading || phase === PHASE.GENERATING) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <p className="text-sm font-semibold text-text-primary">Course Plan Preview</p>
        </div>
        <GeneratingState />
      </div>
    )
  }

  if (!coursePlan) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
          <p className="text-sm font-semibold text-text-primary">Course Plan Preview</p>
        </div>
        <EmptyPlanner phase={phase} />
      </div>
    )
  }

  const { title, subject, description, audience, total_duration, session_frequency, learning_goals, modules } = coursePlan

  return (
    <div className="h-full flex flex-col">
      {/* Panel Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border flex-shrink-0">
        <div>
          <p className="text-sm font-semibold text-text-primary">Course Plan Preview</p>
          <p className="text-xs text-text-muted">{modules?.length || 0} modules · Click any field to edit</p>
        </div>
        <button
          onClick={exportPlan}
          className="flex items-center gap-1.5 text-xs font-medium bg-accent hover:bg-accent-hover text-white px-3 py-2 rounded-lg transition-colors"
        >
          <Download size={13} />
          Export JSON
        </button>
      </div>

      {/* Plan Content */}
      <div className="flex-1 overflow-y-auto px-6 py-5 flex flex-col gap-6">

        {/* Course Overview Card */}
        <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-4">
          {/* Title */}
          <div>
            <p className="text-xs text-text-muted mb-1">Course Title</p>
            <EditableField
              value={title}
              onSave={(v) => updatePlanField('title', v)}
              className="text-xl font-bold text-text-primary"
              tag="h1"
            />
          </div>

          {/* Description */}
          <div>
            <p className="text-xs text-text-muted mb-1">Description</p>
            <EditableField
              value={description}
              onSave={(v) => updatePlanField('description', v)}
              className="text-sm text-text-muted leading-relaxed"
              multiline
              tag="p"
            />
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2 bg-bg rounded-lg p-3">
              <Users size={14} className="text-accent flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Audience</p>
                <p className="text-xs text-text-primary font-medium truncate">
                  {audience?.age_group || '—'} · <span className="capitalize">{audience?.skill_level}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 bg-bg rounded-lg p-3">
              <Clock size={14} className="text-accent flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-text-muted">Duration</p>
                <p className="text-xs text-text-primary font-medium truncate">
                  {total_duration}
                  {session_frequency && ` · ${session_frequency}`}
                </p>
              </div>
            </div>
          </div>

          {/* Learning goals */}
          {learning_goals?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1.5">
                <Target size={11} /> Learning Goals
              </p>
              <ul className="flex flex-col gap-1">
                {learning_goals.map((g, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-muted">
                    <span className="text-success mt-0.5">✓</span>
                    <EditableField
                      value={g}
                      onSave={(v) => {
                        const goals = [...learning_goals]
                        goals[i] = v
                        updatePlanField('learning_goals', goals)
                      }}
                      className="text-text-muted"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Difficulty progression bar */}
        {modules?.length > 0 && (
          <div>
            <p className="text-xs text-text-muted mb-2">Difficulty Progression</p>
            <div className="flex gap-1 items-center">
              {modules.map((m, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <div className={clsx(
                    'h-2 w-full rounded-full',
                    m.difficulty === 'beginner'     && 'bg-success',
                    m.difficulty === 'intermediate' && 'bg-warning',
                    m.difficulty === 'advanced'     && 'bg-error',
                  )} />
                  <span className="text-[9px] text-text-muted">M{m.id}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[10px] text-text-muted mt-1">
              <span className="text-success">Beginner</span>
              <span className="text-warning">Intermediate</span>
              <span className="text-error">Advanced</span>
            </div>
          </div>
        )}

        {/* Module Cards */}
        {modules?.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              Modules ({modules.length})
            </p>
            {modules.map((module, i) => (
              <ModuleCard key={module.id || i} module={module} moduleIdx={i} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
