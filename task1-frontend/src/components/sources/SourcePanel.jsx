import { useState, useRef } from 'react'
import { Upload, Globe, Loader2, AlertCircle, Youtube } from 'lucide-react'
import { useStore } from '../../stores/useStore'
import SourceBadge from './SourceBadge'
import clsx from 'clsx'

export default function SourcePanel() {
  const { sources, sourcesLoading, ingestFile, ingestUrl, removeSource } = useStore()
  const [url, setUrl] = useState('')
  const [urlError, setUrlError] = useState('')
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState('')
  const fileInputRef = useRef()

  const handleFiles = async (files) => {
    setFileError('')
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop().toLowerCase()
      if (!['pdf', 'pptx', 'ppt'].includes(ext)) {
        setFileError(`"${file.name}" is not supported (PDF or PPTX only)`)
        continue
      }
      try {
        await ingestFile(file)
      } catch (err) {
        setFileError(err.message)
      }
    }
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    handleFiles(e.dataTransfer.files)
  }

  const handleUrlSubmit = async (e) => {
    e.preventDefault()
    setUrlError('')
    const trimmed = url.trim()
    if (!trimmed) return
    try {
      new URL(trimmed)
    } catch {
      setUrlError('Please enter a valid URL starting with https://')
      return
    }
    try {
      await ingestUrl(trimmed)
      setUrl('')
    } catch (err) {
      setUrlError(err.message)
    }
  }

  const isYoutube = url.includes('youtube.com') || url.includes('youtu.be')

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto p-4">
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-1">Knowledge Sources</h2>
        <p className="text-xs text-text-muted">Add PDFs, slides, videos, or web pages</p>
      </div>

      {/* File drop zone */}
      <div
        className={clsx(
          'border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200',
          dragOver
            ? 'border-accent bg-accent/10'
            : 'border-border hover:border-accent/50 hover:bg-surface',
          sourcesLoading && 'pointer-events-none opacity-60'
        )}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.pptx,.ppt"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        {sourcesLoading ? (
          <div className="flex flex-col items-center gap-2">
            <Loader2 size={24} className="text-accent animate-spin" />
            <p className="text-sm text-text-muted">Processing source...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <Upload size={24} className="text-text-muted" />
            <p className="text-sm text-text-primary font-medium">Drop files here</p>
            <p className="text-xs text-text-muted">PDF · PPTX</p>
          </div>
        )}
      </div>

      {fileError && (
        <div className="flex items-start gap-2 text-xs text-error bg-error/10 border border-error/20 rounded-lg p-3">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>{fileError}</span>
        </div>
      )}

      {/* URL input */}
      <form onSubmit={handleUrlSubmit} className="flex flex-col gap-2">
        <div className="relative flex items-center">
          {isYoutube
            ? <Youtube size={14} className="absolute left-3 text-rose-400" />
            : <Globe size={14} className="absolute left-3 text-blue-400" />
          }
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="YouTube URL or webpage URL"
            className="w-full bg-surface border border-border rounded-lg pl-9 pr-4 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:border-accent transition-colors"
            disabled={sourcesLoading}
          />
        </div>
        {urlError && (
          <p className="text-xs text-error flex items-center gap-1">
            <AlertCircle size={12} /> {urlError}
          </p>
        )}
        <button
          type="submit"
          disabled={!url.trim() || sourcesLoading}
          className="bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg py-2 transition-colors"
        >
          {sourcesLoading ? 'Processing...' : 'Add Source'}
        </button>
      </form>

      {/* Loaded sources */}
      {sources.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Loaded ({sources.length})
            </p>
          </div>
          {sources.map((source) => (
            <SourceBadge
              key={source.source_id}
              source={source}
              onRemove={removeSource}
            />
          ))}
        </div>
      )}

      {sources.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-text-muted text-center leading-relaxed">
            Add at least one source to start asking questions
          </p>
        </div>
      )}
    </div>
  )
}
