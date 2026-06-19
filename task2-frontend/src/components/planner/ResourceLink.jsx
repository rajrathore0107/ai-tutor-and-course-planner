import { Youtube, FileText, Code2, BookOpen, ExternalLink } from 'lucide-react'
import clsx from 'clsx'

const TYPE_CONFIG = {
  youtube:       { icon: Youtube,   color: 'text-rose-400',   bg: 'bg-rose-500/10',   label: 'Video' },
  article:       { icon: FileText,  color: 'text-blue-400',   bg: 'bg-blue-500/10',   label: 'Article' },
  exercise:      { icon: Code2,     color: 'text-success',    bg: 'bg-success/10',    label: 'Exercise' },
  documentation: { icon: BookOpen,  color: 'text-accent',     bg: 'bg-accent/10',     label: 'Docs' },
  book:          { icon: BookOpen,  color: 'text-warning',    bg: 'bg-warning/10',    label: 'Book' },
}

export default function ResourceLink({ resource }) {
  const cfg = TYPE_CONFIG[resource.type] || TYPE_CONFIG.article
  const Icon = cfg.icon

  // LLMs frequently hallucinate exact URL paths (like YouTube video IDs or Wikipedia pages), 
  // resulting in 404 Page Not Found errors even if the URL starts with 'https://'.
  // The ultimate fix is to convert ALL generative resource links into search queries!
  const isYoutube = resource.type === 'youtube' || (resource.url && (resource.url.includes('youtube.com') || resource.url.includes('youtu.be')))
  
  let href = ''
  if (isYoutube) {
    href = `https://www.youtube.com/results?search_query=${encodeURIComponent(resource.title)}`
  } else {
    // For articles, books, exercises, etc., search Google for the title
    href = `https://www.google.com/search?q=${encodeURIComponent(resource.title)}`
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className={clsx(
        'flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all hover:scale-[1.01]',
        cfg.bg, 'border border-current border-opacity-20 group'
      )}
    >
      <Icon size={12} className={clsx('flex-shrink-0', cfg.color)} />
      <div className="flex-1 min-w-0">
        <p className={clsx('font-medium truncate', cfg.color)}>{resource.title}</p>
        {resource.description && (
          <p className="text-text-muted truncate mt-0.5">{resource.description}</p>
        )}
      </div>
      <ExternalLink size={10} className="text-text-muted opacity-0 group-hover:opacity-60 flex-shrink-0 transition-opacity" />
    </a>
  )
}
