/**
 * Parses inline source citations from LLM output.
 * Format: [SOURCE:source_type:reference]
 * Examples:
 *   [SOURCE:pdf:page 4]
 *   [SOURCE:pptx:slide 3]
 *   [SOURCE:youtube:3:22]
 *   [SOURCE:url:docs.python.org]
 */

const SOURCE_REGEX = /\[SOURCE:(pdf|pptx|youtube|url):([^\]]+)\]/g

export function processCitationsForMarkdown(text) {
  // Convert [SOURCE:type:ref] into a special markdown link
  // e.g. [SOURCE:pdf:page 4] -> [📄 page 4](#citation:pdf:page 4)
  return text.replace(/\[SOURCE:(pdf|pptx|youtube|url):([^\]]+)\]/g, (match, type, ref) => {
    const label = getCitationLabel(type, ref)
    // Encode the ref just in case it has weird characters
    return `[${label}](#citation:${type}:${encodeURIComponent(ref)})`
  })
}

export function getCitationLabel(sourceType, reference) {
  switch (sourceType) {
    case 'pdf':    return `📄 ${reference}`
    case 'pptx':   return `📊 ${reference}`
    case 'youtube': return `▶ ${reference}`
    case 'url':    return `🔗 ${reference}`
    default:       return reference
  }
}

export function getCitationClass(sourceType) {
  const map = {
    pdf:     'citation-pdf',
    pptx:    'citation-pptx',
    youtube: 'citation-youtube',
    url:     'citation-url',
  }
  return map[sourceType] || 'citation-url'
}
