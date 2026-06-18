import clsx from 'clsx'

const LABELS = {
  beginner: '● Beginner',
  intermediate: '◆ Intermediate',
  advanced: '■ Advanced',
}

export default function DifficultyPill({ level, small = false }) {
  return (
    <span className={clsx(
      'inline-flex items-center rounded-full font-medium tracking-wide',
      small ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
      level === 'beginner'     && 'diff-pill-beginner',
      level === 'intermediate' && 'diff-pill-intermediate',
      level === 'advanced'     && 'diff-pill-advanced',
    )}>
      {LABELS[level] || level}
    </span>
  )
}
