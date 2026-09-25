/**
 * DataLane (hosted) — AI data analysis under /v1/datalane/*.
 * Parses plain-English chart intents, applies transforms (group/aggregate/
 * filter/sort/limit), and renders editable HTML artifacts. Self-hostable
 * core: @talocode/datalane.
 */

export const DATALANE_VERSION = '0.1.0'

export type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'table'
export type Aggregation = 'sum' | 'avg' | 'count' | 'min' | 'max'
export type FilterOp = 'eq' | 'neq' | 'gt' | 'gte' | 'lt' | 'lte' | 'contains'

export interface DataLaneFilter {
  column: string
  op: FilterOp
  value: unknown
}

export interface ChartSpec {
  chartType: ChartType
  x: string
  y?: string
  color?: string
  aggregation?: Aggregation
  filters?: DataLaneFilter[]
  sortBy?: { column: string; direction: 'asc' | 'desc' }
  limit?: number
  title?: string
}

const NUMBER_RE = /^-?\d+(\.\d+)?$/
const BOOL_RE = /^(true|false)$/i

export function parseCsvRows(text: string): Array<Record<string, unknown>> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
  if (lines.length < 2) return []
  const splitLine = (line: string): string[] => {
    const out: string[] = []
    let cur = ''
    let inQuotes = false
    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          cur += '"'
          i++
        } else {
          inQuotes = !inQuotes
        }
      } else if (ch === ',' && !inQuotes) {
        out.push(cur)
        cur = ''
      } else {
        cur += ch
      }
    }
    out.push(cur)
    return out
  }
  const headers = splitLine(lines[0]).map((h) => h.replace(/^"(.*)"$/, '$1').trim())
  const rows: Array<Record<string, unknown>> = []
  for (let i = 1; i < lines.length; i++) {
    const cells = splitLine(lines[i])
    const row: Record<string, unknown> = {}
    for (let c = 0; c < headers.length; c++) {
      const raw = (cells[c] ?? '').replace(/^"(.*)"$/, '$1').trim()
      let value: unknown = raw
      if (BOOL_RE.test(raw)) value = raw.toLowerCase() === 'true'
      else if (NUMBER_RE.test(raw)) value = Number(raw)
      else if (raw === '') value = null
      row[headers[c]] = value
    }
    rows.push(row)
  }
  return rows
}

export function columnsOfRows(rows: Array<Record<string, unknown>>): string[] {
  const set = new Set<string>()
  for (const row of rows) for (const key of Object.keys(row)) set.add(key)
  return [...set]
}

function inferType(rows: Array<Record<string, unknown>>, column: string): 'number' | 'string' | 'boolean' {
  const sample = rows.slice(0, 200)
  let numeric = 0
  let bools = 0
  for (const row of sample) {
    const v = row[column]
    if (typeof v === 'number') numeric++
    else if (typeof v === 'boolean') bools++
    else if (typeof v === 'string' && NUMBER_RE.test(v)) numeric++
  }
  if (bools === sample.length && sample.length > 0) return 'boolean'
  if (numeric > sample.length / 2) return 'number'
  return 'string'
}

function detectChartType(text: string): ChartType {
  const t = text.toLowerCase()
  if (/\bpie\b|share of|proportion/.test(t)) return 'pie'
  if (/\bscatter\b|plot\b|correlation|relationship between/.test(t)) return 'scatter'
  if (/\bline\b|trend|over time|monthly|daily|weekly/.test(t)) return 'line'
  if (/\btable\b|list\b|rows? of/.test(t)) return 'table'
  return 'bar'
}

function detectAggregation(text: string): Aggregation | undefined {
  const t = text.toLowerCase()
  if (/\bcount\b|how many\b|number of/.test(t)) return 'count'
  if (/\bavg\b|average\b|mean\b/.test(t)) return 'avg'
  if (/\bmin\b|minimum\b|lowest\b/.test(t)) return 'min'
  if (/\bmax\b|maximum\b|highest\b|top\b/.test(t)) return 'max'
  if (/\btotal\b|sum\b/.test(t)) return 'sum'
  return undefined
}

export function parseDataLaneIntent(text: string, columns: string[], rows: Array<Record<string, unknown>> = []): ChartSpec {
  const types = new Map<string, 'number' | 'string' | 'boolean'>()
  for (const c of columns) types.set(c, inferType(rows, c))
  const numeric = columns.filter((c) => types.get(c) === 'number')
  const categorical = columns.filter((c) => types.get(c) !== 'number')

  const chartType = detectChartType(text)
  const aggregation = detectAggregation(text)
  const t = text.toLowerCase()

  let x = categorical.find((c) => t.includes(c.toLowerCase()))
  if (!x) x = columns.find((c) => t.includes(c.toLowerCase()))
  if (!x) x = categorical[0] ?? columns[0]

  let y = numeric.find((c) => t.includes(c.toLowerCase()))
  if (!y) y = numeric[0]

  const filters: ChartSpec['filters'] = []
  for (const col of columns) {
    const m = t.match(new RegExp(`${col.toLowerCase()}\\s*(>|>=|<|<=|=|contains)\\s*(\\d+\\.?\\d*|"[^"]+"|'[^']+')`))
    if (m) {
      const raw = m[2].replace(/^["']|["']$/g, '')
      let value: unknown = raw
      if (NUMBER_RE.test(raw)) value = Number(raw)
      const opMap: Record<string, FilterOp> = { '>': 'gt', '>=': 'gte', '<': 'lt', '<=': 'lte', '=': 'eq', contains: 'contains' }
      filters.push({ column: col, op: opMap[m[1]] ?? 'eq', value })
    }
  }

  let sortBy: ChartSpec['sortBy']
  if (/descending|highest|largest|top|desc/.test(t)) sortBy = { column: y ?? x, direction: 'desc' }
  else if (/ascending|lowest|smallest|asc/.test(t)) sortBy = { column: y ?? x, direction: 'asc' }

  let limit: number | undefined
  const lm = t.match(/limit\s+(\d+)/)
  if (lm) limit = Number(lm[1])

  return { chartType, x, y, aggregation, filters, sortBy, limit }
}

export function applyDataLaneTransform(rows: Array<Record<string, unknown>>, spec: ChartSpec): Array<Record<string, unknown>> {
  let out = rows
  if (spec.filters) {
    for (const f of spec.filters) {
      out = out.filter((r) => {
        const v = r[f.column]
        switch (f.op) {
          case 'eq': return v === f.value || String(v) === String(f.value)
          case 'neq': return v !== f.value && String(v) !== String(f.value)
          case 'gt': return Number(v) > Number(f.value)
          case 'gte': return Number(v) >= Number(f.value)
          case 'lt': return Number(v) < Number(f.value)
          case 'lte': return Number(v) <= Number(f.value)
          case 'contains': return String(v ?? '').toLowerCase().includes(String(f.value).toLowerCase())
          default: return true
        }
      })
    }
  }
  if (spec.y) {
    const { x, y, color, aggregation } = spec
    const agg = aggregation ?? 'sum'
    const groups = new Map<string, { count: number; sum: number; min: number; max: number }>()
    const order: string[] = []
    const keyFor = (row: Record<string, unknown>) => (color ? `${String(row[x] ?? '')}__${String(row[color] ?? '')}` : String(row[x] ?? ''))
    for (const row of out) {
      const key = keyFor(row)
      if (!groups.has(key)) {
        groups.set(key, { count: 0, sum: 0, min: y ? Number(row[y] ?? 0) : 0, max: y ? Number(row[y] ?? 0) : 0 })
        order.push(key)
      }
      const g = groups.get(key)!
      g.count++
      const num = y ? Number(row[y] ?? 0) : 0
      g.sum += num
      g.min = Math.min(g.min, num)
      g.max = Math.max(g.max, num)
    }
    out = order.map((key) => {
      const g = groups.get(key)!
      const [xVal, cVal] = color ? key.split('__') : [key, '']
      const av = agg === 'count' ? g.count : agg === 'avg' ? g.sum / g.count : agg === 'min' ? g.min : agg === 'max' ? g.max : g.sum
      const row: Record<string, unknown> = { [x]: xVal }
      if (color) row[color] = cVal
      row.y = typeof av === 'number' ? Math.round(av * 100) / 100 : av
      return row
    })
  }
  if (spec.sortBy) {
    const { column, direction } = spec.sortBy
    out = [...out].sort((a, b) => {
      const av = Number(a[column] ?? 0)
      const bv = Number(b[column] ?? 0)
      return direction === 'desc' ? bv - av : av - bv
    })
  }
  if (spec.limit) out = out.slice(0, spec.limit)
  return out
}

export function buildDataLaneChart(input: {
  text?: string
  intent?: string
  spec?: ChartSpec
  rows?: Array<Record<string, unknown>>
  columns?: string[]
}): { spec: ChartSpec; columns: string[]; rows: Array<Record<string, unknown>>; summary: string } {
  const rows = input.rows ?? []
  const columns = input.columns?.length ? input.columns : columnsOfRows(rows)
  const spec: ChartSpec = input.spec
    ? input.spec
    : parseDataLaneIntent(input.intent ?? '', columns, rows)
  const out = applyDataLaneTransform(rows, spec)
  const top = out
    .slice(0, 3)
    .map((r) => Object.values(r).join(' = '))
    .join('; ')
  const group = spec.color ? ` grouped by ${spec.color}` : ''
  return {
    spec,
    columns: Object.keys(out[0] ?? {}),
    rows: out,
    summary: `${spec.aggregation ?? 'raw'} of ${spec.y ?? spec.x} by ${spec.x}${group} (${out.length} rows). Sample: ${top}`,
  }
}

export function getDataLanePricing() {
  return {
    product: 'datalane',
    version: DATALANE_VERSION,
    credits: {
      'datalane.analyze': 5,
      'datalane.anchor': 2,
      'datalane.render': 1,
    },
    note: 'Plain-English chart intents, deterministic transforms, editable HTML artifacts. Self-hostable core: @talocode/datalane.',
  }
}

export function getDataLaneCapabilities() {
  return {
    product: 'datalane',
    version: DATALANE_VERSION,
    endpoints: [
      'GET /v1/datalane/health',
      'GET /v1/datalane/pricing',
      'GET /v1/datalane/capabilities',
      'POST /v1/datalane/analyze',
      'POST /v1/datalane/render',
    ],
    features: [
      'Plain-English chart intent parsing (deterministic)',
      'Chart types: bar, line, scatter, pie, table',
      'Aggregations: sum, avg, count, min, max',
      'Filters, sort, limits',
      'Editable HTML artifact with embedded spec + data',
    ],
    limitations: [
      'Deterministic intent parsing only in v0.1 — no LLM rewrite',
      'Hosted analyze accepts rows directly (JSON); file/URL loading is handled by the self-hosted CLI',
    ],
  }
}