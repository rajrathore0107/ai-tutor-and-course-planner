import { useState } from 'react'
import { ChevronDown, ChevronUp, BookOpen, ClipboardList, Tag } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import EditableField from './EditableField'
import DifficultyPill from './DifficultyPill'
import ResourceLink from './ResourceLink'
import clsx from 'clsx'

function LessonRow({ lesson, moduleIdx, lessonIdx }) {
  const { updatePlanField } = useStore()
  const [open, setOpen] = useState(false)

  const path = (field) => `modules.${moduleIdx}.lessons.${lessonIdx}.${field}`

  return (
    <div className="border border-border/50 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface/50 transition-colors text-left"
      >
        <div className={clsx(
          'w-1.5 h-1.5 rounded-full flex-shrink-0',
          lesson.difficulty === 'beginner'     && 'bg-success',
          lesson.difficulty === 'intermediate' && 'bg-warning',
          lesson.difficulty === 'advanced'     && 'bg-error',
        )} />
        <span className="text-sm text-text-primary font-medium flex-1 truncate">{lesson.title}</span>
        <DifficultyPill level={lesson.difficulty} small />
        {lesson.estimated_duration_minutes && (
          <span className="text-xs text-text-muted flex-shrink-0">{lesson.estimated_duration_minutes}m</span>
        )}
        {open ? <ChevronUp size={14} className="text-text-muted flex-shrink-0" /> : <ChevronDown size={14} className="text-text-muted flex-shrink-0" />}
      </button>

      {open && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t border-border/50 pt-3">
          {/* Editable title */}
          <div>
            <p className="text-xs text-text-muted mb-1">Title</p>
            <EditableField
              value={lesson.title}
              onSave={(v) => updatePlanField(path('title'), v)}
              className="text-sm text-text-primary font-medium"
            />
          </div>

          {/* Topics */}
          {lesson.topics?.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-1.5">Topics</p>
              <div className="flex flex-wrap gap-1.5">
                {lesson.topics.map((t, i) => (
                  <span key={i} className="text-xs bg-accent/10 text-accent rounded-full px-2.5 py-1 border border-accent/20">
                    {t}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Resources */}
          {lesson.resources?.length > 0 && (
            <div>
              <p className="text-xs text-text-muted mb-1.5">Resources</p>
              <div className="flex flex-col gap-1.5">
                {lesson.resources.map((r, i) => (
                  <ResourceLink key={i} resource={r} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default function ModuleCard({ module, moduleIdx }) {
  const { updatePlanField } = useStore()
  const [expanded, setExpanded] = useState(moduleIdx === 0)

  const path = (field) => `modules.${moduleIdx}.${field}`

  const diffClass = {
    beginner:     'diff-beginner',
    intermediate: 'diff-intermediate',
    advanced:     'diff-advanced',
  }[module.difficulty] || ''

  return (
    <div className={clsx('bg-surface rounded-xl overflow-hidden border border-border', diffClass)}>
      {/* Module Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors text-left"
      >
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-accent/15 text-accent flex items-center justify-center text-sm font-bold">
          {module.id}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <EditableField
              value={module.title}
              onSave={(v) => updatePlanField(path('title'), v)}
              className="text-sm font-semibold text-text-primary"
              onClick={(e) => e.stopPropagation()}
            />
            <DifficultyPill level={module.difficulty} />
            {module.estimated_duration_weeks && (
              <span className="text-xs text-text-muted">{module.estimated_duration_weeks}w</span>
            )}
          </div>
          {module.objectives?.length > 0 && (
            <p className="text-xs text-text-muted mt-1 truncate">
              {module.objectives[0]}
              {module.objectives.length > 1 && ` +${module.objectives.length - 1} more`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs text-text-muted">{module.lessons?.length || 0} lessons</span>
          {expanded ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 flex flex-col gap-4 border-t border-border/50">
          {/* Objectives */}
          {module.objectives?.length > 0 && (
            <div className="pt-3">
              <p className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1.5">
                <BookOpen size={11} /> Learning Objectives
              </p>
              <ul className="flex flex-col gap-1">
                {module.objectives.map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-text-muted">
                    <span className="text-accent mt-0.5">▸</span>
                    <EditableField
                      value={obj}
                      onSave={(v) => {
                        const objs = [...module.objectives]
                        objs[i] = v
                        updatePlanField(path('objectives'), objs)
                      }}
                      className="text-text-muted"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Prerequisites */}
          {module.prerequisites?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-2 flex items-center gap-1.5">
                <Tag size={11} /> Prerequisites
              </p>
              <div className="flex flex-wrap gap-1.5">
                {module.prerequisites.map((p, i) => (
                  <span key={i} className="text-xs bg-border/50 text-text-muted rounded-full px-2.5 py-1">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Lessons */}
          {module.lessons?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-text-muted mb-2">Lessons</p>
              <div className="flex flex-col gap-2">
                {module.lessons.map((lesson, li) => (
                  <LessonRow key={lesson.id || li} lesson={lesson} moduleIdx={moduleIdx} lessonIdx={li} />
                ))}
              </div>
            </div>
          )}

          {/* Assessment */}
          {module.assessment && (
            <div className="bg-accent/5 border border-accent/20 rounded-lg px-4 py-3">
              <p className="text-xs font-medium text-accent mb-1 flex items-center gap-1.5">
                <ClipboardList size={11} /> Module Assessment
              </p>
              <EditableField
                value={module.assessment.title}
                onSave={(v) => updatePlanField(path('assessment.title'), v)}
                className="text-sm text-text-primary font-medium"
              />
              <p className="text-xs text-text-muted mt-1">{module.assessment.description}</p>
              {module.assessment.estimated_duration_minutes && (
                <p className="text-xs text-text-muted mt-1 opacity-60">
                  ~{module.assessment.estimated_duration_minutes} min
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
