import { useState } from 'react'
import { FileText, Presentation, Youtube, Globe, ChevronDown, ChevronUp, CheckCircle, X } from 'lucide-react'
import clsx from 'clsx'

const SOURCE_CONFIG = {
  pdf: {
    icon: FileText,
    label: 'PDF',
    badgeClass: 'source-badge-pdf',
    dotClass: 'bg-red-400',
  },
  pptx: {
    icon: Presentation,
    label: 'Slides',
    badgeClass: 'source-badge-pptx',
    dotClass: 'bg-orange-400',
  },
  youtube: {
    icon: Youtube,
    label: 'Video',
    badgeClass: 'source-badge-youtube',
    dotClass: 'bg-rose-400',
  },
  url: {
    icon: Globe,
    label: 'Web',
    badgeClass: 'source-badge-url',
    dotClass: 'bg-blue-400',
  },
}

export default function SourceBadge({ source, onRemove }) {
  const [expanded, setExpanded] = useState(false)
  const config = SOURCE_CONFIG[source.source_type] || SOURCE_CONFIG.url
  const Icon = config.icon

  return (
    <div className={clsx(
      'rounded-lg px-3 py-2 text-sm flex flex-col gap-1 transition-all duration-200',
      config.badgeClass,
    )}>
      <div className="flex items-center gap-2">
        <span className={clsx('w-2 h-2 rounded-full flex-shrink-0', config.dotClass)} />
        <Icon size={14} className="flex-shrink-0" />
        <span
          className="font-medium truncate max-w-[120px] cursor-pointer"
          onClick={() => setExpanded((v) => !v)}
        >
          {source.label}
        </span>
        <span className="text-xs opacity-60 flex-shrink-0">
          {source.chunks_indexed} chunks
        </span>

        {/* Expand toggle */}
        <button
          onClick={() => setExpanded((v) => !v)}
          className="ml-auto opacity-60 hover:opacity-100 transition-opacity flex-shrink-0"
        >
          {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>

        {/* Remove button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove(source.source_id)
          }}
          title="Remove source"
          className="opacity-50 hover:opacity-100 hover:text-red-400 transition-all flex-shrink-0"
        >
          <X size={13} />
        </button>
      </div>

      {expanded && source.summary && (
        <div className="mt-1 text-xs opacity-80 leading-relaxed border-t border-current border-opacity-20 pt-2">
          {source.summary}
          <div className="mt-1 flex items-center gap-1 opacity-60">
            <CheckCircle size={10} />
            <span>Indexed & ready</span>
          </div>
        </div>
      )}
    </div>
  )
}
