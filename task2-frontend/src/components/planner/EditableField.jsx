import { useRef, useEffect } from 'react'
import { Pencil } from 'lucide-react'
import clsx from 'clsx'

/**
 * Inline editable text field.
 * Renders as plain text; on focus becomes contenteditable.
 * Calls onSave(newValue) on blur or Enter.
 */
export default function EditableField({
  value,
  onSave,
  className = '',
  placeholder = 'Click to edit',
  multiline = false,
  tag: Tag = 'span',
}) {
  const ref = useRef()

  useEffect(() => {
    if (ref.current && ref.current.innerText !== value) {
      ref.current.innerText = value || ''
    }
  }, [value])

  const handleBlur = () => {
    const newVal = ref.current?.innerText?.trim() || ''
    if (newVal !== value) onSave(newVal)
  }

  const handleKeyDown = (e) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault()
      ref.current?.blur()
    }
    if (e.key === 'Escape') {
      ref.current.innerText = value || ''
      ref.current?.blur()
    }
  }

  return (
    <span className="group relative inline-flex items-start gap-1">
      <Tag
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        data-placeholder={placeholder}
        className={clsx(
          'outline-none focus:ring-1 focus:ring-accent/50 focus:bg-accent/5 rounded px-1 -mx-1 transition-all cursor-text min-w-[40px]',
          'empty:before:content-[attr(data-placeholder)] empty:before:text-text-muted empty:before:italic',
          className
        )}
      />
      <Pencil
        size={10}
        className="opacity-0 group-hover:opacity-40 text-text-muted mt-1 flex-shrink-0 transition-opacity"
      />
    </span>
  )
}
