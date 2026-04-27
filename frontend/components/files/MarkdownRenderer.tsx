'use client'

import { useMemo } from 'react'

interface MarkdownRendererProps {
  content: string
}

/**
 * Lightweight Markdown renderer using regex transforms.
 * Renders into HTML with .mars-markdown class for styling via mars.css.
 * (No extra dependency required.)
 */
export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const html = useMemo(() => renderMarkdown(content), [content])

  return (
    <div
      className="mars-markdown px-4 py-3"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderMarkdown(md: string): string {
  // Strip HTML comments (LLM sometimes adds <!-- filename: ... --> hints)
  let cleaned = md.replace(/<!--[\s\S]*?-->/g, '')
  // Also strip already-escaped HTML comment variants
  cleaned = cleaned.replace(/&lt;!--[\s\S]*?--&gt;/g, '')

  let html = ''
  const lines = cleaned.split('\n')
  let inCodeBlock = false
  let codeBlockContent = ''
  let codeBlockLang = ''
  let inList: 'ul' | 'ol' | null = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Code blocks
    if (line.startsWith('```')) {
      if (inCodeBlock) {
        html += `<pre><code>${escapeHtml(codeBlockContent.trimEnd())}</code></pre>\n`
        codeBlockContent = ''
        inCodeBlock = false
      } else {
        if (inList) { html += inList === 'ul' ? '</ul>' : '</ol>'; inList = null }
        codeBlockLang = line.slice(3).trim()
        inCodeBlock = true
      }
      continue
    }

    if (inCodeBlock) {
      codeBlockContent += line + '\n'
      continue
    }

    // Close lists if needed
    const isListItem = line.match(/^(\s*[-*]|\s*\d+\.)\s/)
    if (!isListItem && inList) {
      html += inList === 'ul' ? '</ul>\n' : '</ol>\n'
      inList = null
    }

    // Blank line
    if (line.trim() === '') {
      if (inList) { html += inList === 'ul' ? '</ul>\n' : '</ol>\n'; inList = null }
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      html += `<h${level}>${inlineMarkdown(headingMatch[2])}</h${level}>\n`
      continue
    }

    // Horizontal rules
    if (line.match(/^(-{3,}|_{3,}|\*{3,})$/)) {
      html += '<hr>\n'
      continue
    }

    // Blockquotes
    if (line.startsWith('> ')) {
      html += `<blockquote><p>${inlineMarkdown(line.slice(2))}</p></blockquote>\n`
      continue
    }

    // Unordered list items
    const ulMatch = line.match(/^\s*[-*]\s+(.+)$/)
    if (ulMatch) {
      if (inList !== 'ul') {
        if (inList) html += '</ol>\n'
        html += '<ul>\n'
        inList = 'ul'
      }
      html += `  <li>${inlineMarkdown(ulMatch[1])}</li>\n`
      continue
    }

    // Ordered list items
    const olMatch = line.match(/^\s*\d+\.\s+(.+)$/)
    if (olMatch) {
      if (inList !== 'ol') {
        if (inList) html += '</ul>\n'
        html += '<ol>\n'
        inList = 'ol'
      }
      html += `  <li>${inlineMarkdown(olMatch[1])}</li>\n`
      continue
    }

    // Paragraph
    html += `<p>${inlineMarkdown(line)}</p>\n`
  }

  // Close any open blocks
  if (inCodeBlock) {
    html += `<pre><code>${escapeHtml(codeBlockContent.trimEnd())}</code></pre>\n`
  }
  if (inList) {
    html += inList === 'ul' ? '</ul>\n' : '</ol>\n'
  }

  return html
}

function inlineMarkdown(text: string): string {
  let result = escapeHtml(text)

  // Process inline code FIRST — extract code spans so they aren't
  // affected by bold/italic transforms.  Replace with placeholders,
  // apply formatting, then restore.
  const codeSpans: string[] = []
  result = result.replace(/`(.+?)`/g, (_match, code) => {
    codeSpans.push(`<code>${code}</code>`)
    return `\x00CODE${codeSpans.length - 1}\x00`
  })

  // Bold (must come before italic)
  result = result.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  result = result.replace(/__(.+?)__/g, '<strong>$1</strong>')

  // Italic with asterisks (safe — always treated as emphasis)
  result = result.replace(/\*(.+?)\*/g, '<em>$1</em>')

  // Italic with underscores — only when underscores are at word boundaries,
  // NOT in the middle of words/filenames like some_file_name.py
  // Requires whitespace or start/end of string around the underscores
  result = result.replace(/(^|[\s(])_([^_]+?)_([\s),.:;!?]|$)/g, '$1<em>$2</em>$3')

  // Links [text](url)
  result = result.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // Restore code spans
  result = result.replace(/\x00CODE(\d+)\x00/g, (_match, idx) => codeSpans[parseInt(idx)])

  return result
}
