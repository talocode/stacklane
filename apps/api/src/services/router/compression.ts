export type CompressionMode = 'none' | 'logs' | 'diff' | 'trace' | 'auto'

export interface CompressionOptions {
  mode: CompressionMode
  preserveCodeFences?: boolean
  preserveJsonBlocks?: boolean
  preserveErrorLines?: boolean
  preserveFilePaths?: boolean
  preserveStackTraces?: boolean
  removeDuplicateLogs?: boolean
  truncateNoisyOutput?: boolean
  summarizeRepeatedLines?: boolean
}

export interface CompressionResult {
  compressedText: string
  originalLength: number
  compressedLength: number
  savedPercent: number
  warnings: string[]
}

const DEFAULT_OPTIONS: CompressionOptions = {
  mode: 'auto',
  preserveCodeFences: true,
  preserveJsonBlocks: true,
  preserveErrorLines: true,
  preserveFilePaths: true,
  preserveStackTraces: true,
  removeDuplicateLogs: true,
  truncateNoisyOutput: true,
  summarizeRepeatedLines: true
}

function detectMode(text: string): CompressionMode {
  const lines = text.split('\n').length
  const hasStackTraces = /at\s+\S+\s+\(/.test(text) || /^\s+at\s/.test(text)
  const hasLogs = /\[.*?\]/.test(text) && /\d{4}-\d{2}-\d{2}/.test(text)
  const hasDiffs = /^[+-]{3}/.test(text) || /^diff\s--git/.test(text)
  const hasTraces = /^#\d+\s+0x/.test(text) || /^0x[0-9a-f]+\s+/.test(text)

  if (hasTraces && hasStackTraces && lines > 30) return 'trace'
  if (hasDiffs && lines > 20) return 'diff'
  if (hasLogs && lines > 20) return 'logs'
  return 'logs'
}

function isCodeFence(line: string): boolean {
  return /^```/.test(line.trim())
}

function isJsonBlockLine(line: string): boolean {
  const trimmed = line.trim()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return true
  if (trimmed.startsWith('"') && trimmed.includes('":')) return true
  if (trimmed.startsWith('}') || trimmed.startsWith(']')) return true
  return false
}

function isFilePath(line: string): boolean {
  return /\/([a-zA-Z0-9_-]+\/)+[a-zA-Z0-9_.-]+/.test(line) || /^[a-zA-Z]:\\([a-zA-Z0-9_-]+\\)+/.test(line)
}

function isErrorLine(line: string): boolean {
  const trimmed = line.trim()
  const errorPatterns = [
    /^Error:/, /^error:/, /^ERROR:/,
    /^[A-Z][a-z]+Error:/, /\b(Error|error):/,
    /^\s+at\s/, /^\s+-\s+/, /^\d+\)\s/,
    /^Failed/, /^failed/, /^FAILED/,
    /^Uncaught/, /^Traceback/, /^File "/,
    /^\d+:\d+/, /warning:/, /^WARNING:/,
    /^fatal:/, /^FATAL:/, /^\s*\^+/
  ]
  return errorPatterns.some(p => p.test(trimmed))
}

function isStackFrame(line: string): boolean {
  return /^\s+at\s/.test(line) || /^#\d+\s+0x/.test(line)
}

function isNoisyLine(line: string): boolean {
  const trimmed = line.trim().toLowerCase()
  const noisyPatterns = [
    /^npm (warn|notice|http|timing|verbose|silly)/,
    /^\d+\s+(downloading|extracting|installing)/,
    /^\[?\d{2}:\d{2}:\d{2}\]?\s+downloading/,
    /^\s+-\s+[a-f0-9]{4,}\s/,
    /^\[[<>]\s+\d+\]/, /^\d+\.\d+\s+[kMG]?B\//,
    /^\d+%\)?\s*(of|done)/,
    /^\/\d+\s+\|/, /^\(node:\d+\)/,
    /ExperimentalWarning/,
    /\(Use .node.`--trace-warnings/,
    /\(node:\d+\)\s+\[/
  ]
  return noisyPatterns.some(p => p.test(trimmed))
}

function summarizeRepeatedSequences(lines: string[]): string[] {
  const result: string[] = []
  let i = 0
  while (i < lines.length) {
    const current = lines[i]
    let repeatCount = 1
    while (i + repeatCount < lines.length && lines[i + repeatCount] === current) {
      repeatCount++
    }
    if (repeatCount > 3) {
      result.push(current)
      result.push(`  [repeated ${repeatCount} times]`)
      i += repeatCount
    } else if (repeatCount > 1) {
      for (let j = 0; j < repeatCount; j++) {
        result.push(current)
      }
      i += repeatCount
    } else {
      result.push(current)
      i++
    }
  }
  return result
}

function compressLogs(text: string, options: CompressionOptions): CompressionResult {
  const originalLength = text.length
  const warnings: string[] = []
  const lines = text.split('\n')

  const filteredLines: string[] = []
  let inCodeFence = false
  let inJsonBlock = false
  let seenLines = new Set<string>()
  let consecutiveNoise = 0
  let truncatedWarningEmitted = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (options.preserveCodeFences && isCodeFence(line)) {
      inCodeFence = !inCodeFence
      filteredLines.push(line)
      continue
    }

    if (inCodeFence) {
      filteredLines.push(line)
      continue
    }

    if (options.preserveJsonBlocks && isJsonBlockLine(line)) {
      inJsonBlock = !inJsonBlock || (trimmed === '}' || trimmed === ']' || trimmed.endsWith('}') || trimmed.endsWith(']'))
      filteredLines.push(line)
      continue
    }

    if (options.preserveErrorLines && isErrorLine(line)) {
      filteredLines.push(line)
      continue
    }

    if (options.preserveFilePaths && isFilePath(line)) {
      filteredLines.push(line)
      continue
    }

    if (options.preserveStackTraces && isStackFrame(line)) {
      filteredLines.push(line)
      continue
    }

    if (options.removeDuplicateLogs) {
      const lineKey = trimmed.slice(0, 80)
      if (seenLines.has(lineKey)) {
        continue
      }
      seenLines.add(lineKey)
    }

    if (options.truncateNoisyOutput && isNoisyLine(line)) {
      consecutiveNoise++
      if (consecutiveNoise > 5 && !truncatedWarningEmitted) {
        warnings.push(`Truncated noisy dependency/install output (${lines.length - i} lines remaining)`)
        truncatedWarningEmitted = true
      }
      if (consecutiveNoise > 10) {
        continue
      }
    } else {
      consecutiveNoise = 0
    }

    filteredLines.push(line)
  }

  const afterDedup = options.summarizeRepeatedLines ? summarizeRepeatedSequences(filteredLines) : filteredLines
  const compressedText = afterDedup.join('\n')
  const compressedLength = compressedText.length
  const savedPercent = originalLength > 0 ? Math.round((1 - compressedLength / originalLength) * 100) : 0

  return { compressedText, originalLength, compressedLength, savedPercent, warnings }
}

function compressDiff(text: string, options: CompressionOptions): CompressionResult {
  const warnings: string[] = []
  const originalLength = text.length
  const lines = text.split('\n')
  const filteredLines: string[] = []
  let skipContext = false
  let contextCounter = 0
  const MAX_CONTEXT_LINES = 10

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (options.preserveErrorLines && isErrorLine(line)) {
      filteredLines.push(line)
      continue
    }

    if (line.startsWith('diff --git') || line.startsWith('---') || line.startsWith('+++') || trimmed.startsWith('@@')) {
      filteredLines.push(line)
      skipContext = true
      contextCounter = 0
      continue
    }

    if (line.startsWith('+') || line.startsWith('-')) {
      filteredLines.push(line)
      skipContext = false
      contextCounter = 0
      continue
    }

    if (options.truncateNoisyOutput && skipContext) {
      contextCounter++
      if (contextCounter > MAX_CONTEXT_LINES) {
        if (contextCounter === MAX_CONTEXT_LINES + 1) {
          filteredLines.push('  [...context truncated...]')
        }
        continue
      }
    }

    filteredLines.push(line)
  }

  const compressedText = filteredLines.join('\n')
  const compressedLength = compressedText.length
  const savedPercent = originalLength > 0 ? Math.round((1 - compressedLength / originalLength) * 100) : 0

  return { compressedText, originalLength, compressedLength, savedPercent, warnings }
}

function compressTrace(text: string, options: CompressionOptions): CompressionResult {
  const warnings: string[] = []
  const originalLength = text.length
  const lines = text.split('\n')
  const filteredLines: string[] = []
  let repeatedFrameCount = 0
  let lastFrameKey = ''
  let summaryEmitted = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (options.preserveErrorLines && isErrorLine(line) && !isStackFrame(line)) {
      filteredLines.push(line)
      continue
    }

    if (isStackFrame(line)) {
      const frameKey = line.replace(/0x[0-9a-f]+/g, '0x...').replace(/:(\d+):(\d+)/g, ':...:...')
      if (frameKey === lastFrameKey) {
        repeatedFrameCount++
        continue
      }
      if (repeatedFrameCount > 2 && !summaryEmitted) {
        filteredLines.push(`  [... ${repeatedFrameCount - 2} similar frames omitted ...]`)
        summaryEmitted = true
      }
      repeatedFrameCount = 0
      lastFrameKey = frameKey
      summaryEmitted = false
      filteredLines.push(line)
      continue
    }

    if (options.preserveFilePaths && isFilePath(line)) {
      filteredLines.push(line)
      continue
    }

    filteredLines.push(line)
  }

  if (repeatedFrameCount > 2) {
    filteredLines.push(`  [... ${repeatedFrameCount - 2} similar frames omitted ...]`)
  }

  const compressedText = filteredLines.join('\n')
  const compressedLength = compressedText.length
  const savedPercent = originalLength > 0 ? Math.round((1 - compressedLength / originalLength) * 100) : 0

  return { compressedText, originalLength, compressedLength, savedPercent, warnings }
}

export function compressText(text: string, mode?: CompressionMode): CompressionResult {
  const options = { ...DEFAULT_OPTIONS, mode: mode || DEFAULT_OPTIONS.mode }
  const effectiveMode = options.mode === 'auto' ? detectMode(text) : options.mode

  switch (effectiveMode) {
    case 'diff':
      return compressDiff(text, options)
    case 'trace':
      return compressTrace(text, options)
    case 'logs':
    case 'auto':
    default:
      return compressLogs(text, options)
  }
}
