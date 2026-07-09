/**
 * InvoiceLane Document Intelligence — schema-first extraction engine.
 * Deterministic rule engine for invoices/receipts (v0.1 cloud).
 * OCR/PDF not yet supported; pass text extracted from documents.
 */

export type ExtractionType = 'invoice' | 'receipt' | 'document' | 'auto'

export interface ExtractedItem {
  description: string
  quantity?: number
  unitPrice?: number
  total?: number
  sku?: string
}

export interface ExtractedDocument {
  documentType: ExtractionType
  merchant?: string
  vendor?: string
  customer?: string
  invoiceNumber?: string
  receiptNumber?: string
  date?: string
  dueDate?: string
  currency?: string
  subtotal?: number
  tax?: number
  discount?: number
  total?: number
  items: ExtractedItem[]
  paymentMethod?: string
  confidence: number
  warnings: string[]
  missingFields: string[]
  totalsConsistent?: boolean
  engine: 'rules'
  version: string
}

export interface ValidateResult {
  valid: boolean
  missingFields: string[]
  warnings: string[]
  normalized: Record<string, unknown>
  totalsConsistent?: boolean
}

export interface InvoiceLaneExtractInput {
  type?: ExtractionType
  text?: string
  fileUrl?: string
  base64?: string
  currency?: string
  locale?: string
  fields?: string[]
}

const VERSION = '0.2.0'

const KNOWN_CURRENCIES: Record<string, string> = {
  '₦': 'NGN',
  NGN: 'NGN',
  naira: 'NGN',
  $: 'USD',
  USD: 'USD',
  '€': 'EUR',
  EUR: 'EUR',
  '£': 'GBP',
  GBP: 'GBP',
}

/** Required fields by document contract */
const REQUIRED_BY_TYPE: Record<string, string[]> = {
  invoice: ['invoiceNumber', 'total', 'currency', 'date'],
  receipt: ['total', 'currency', 'date'],
  document: ['total'],
  auto: ['total'],
}

function parseDate(text: string): string | undefined {
  const isoMatch = text.match(/\b(\d{4}-\d{2}-\d{2})\b/)
  if (isoMatch) return isoMatch[1]

  const usMatch = text.match(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/)
  if (usMatch) {
    const [, m, d, y] = usMatch
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }

  const textualMatch = text.match(
    /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})\b/i,
  )
  if (textualMatch) {
    const months: Record<string, string> = {
      january: '01',
      jan: '01',
      february: '02',
      feb: '02',
      march: '03',
      mar: '03',
      april: '04',
      apr: '04',
      may: '05',
      june: '06',
      jun: '06',
      july: '07',
      jul: '07',
      august: '08',
      aug: '08',
      september: '09',
      sep: '09',
      october: '10',
      oct: '10',
      november: '11',
      nov: '11',
      december: '12',
      dec: '12',
    }
    const month = months[textualMatch[2].toLowerCase()]
    if (month) {
      return `${textualMatch[3]}-${month}-${String(textualMatch[1]).padStart(2, '0')}`
    }
  }

  return undefined
}

function parseAmount(str: string): number | undefined {
  const cleaned = str.replace(/[,$]/g, '').trim()
  const num = Number(cleaned)
  return Number.isNaN(num) ? undefined : num
}

function detectCurrency(text: string): { currency?: string; warnings: string[] } {
  const warnings: string[] = []
  const matched: string[] = []
  for (const [symbol, code] of Object.entries(KNOWN_CURRENCIES)) {
    if (text.includes(symbol) && !matched.includes(code)) {
      matched.push(code)
    }
  }
  if (matched.length === 0) return { warnings }
  if (matched.length > 1) {
    warnings.push(`Ambiguous currency: detected ${matched.join(', ')}. Using ${matched[0]}.`)
  }
  return { currency: matched[0], warnings }
}

function computeMissingFields(doc: Partial<ExtractedDocument>, documentType: string): string[] {
  const required = REQUIRED_BY_TYPE[documentType] || REQUIRED_BY_TYPE.auto
  const missing: string[] = []
  for (const field of required) {
    const val = (doc as Record<string, unknown>)[field]
    if (val === undefined || val === null || val === '') {
      missing.push(field)
    }
  }
  return missing
}

function checkTotalsConsistent(doc: {
  subtotal?: number
  tax?: number
  discount?: number
  total?: number
  items: ExtractedItem[]
}): { consistent?: boolean; warning?: string } {
  if (doc.total === undefined) return {}

  if (doc.subtotal !== undefined) {
    const expected =
      doc.subtotal +
      (doc.tax ?? 0) -
      (doc.discount ?? 0)
    const delta = Math.abs(expected - doc.total)
    if (delta > 0.05) {
      return {
        consistent: false,
        warning: `Totals mismatch: subtotal(${doc.subtotal}) + tax(${doc.tax ?? 0}) - discount(${doc.discount ?? 0}) = ${expected.toFixed(2)}, total = ${doc.total}`,
      }
    }
    return { consistent: true }
  }

  if (doc.items.length > 0) {
    const itemSum = doc.items.reduce((s, i) => s + (i.total ?? 0), 0)
    if (itemSum > 0) {
      const expected = itemSum + (doc.tax ?? 0) - (doc.discount ?? 0)
      const delta = Math.abs(expected - doc.total)
      if (delta > 0.05 && Math.abs(itemSum - doc.total) > 0.05) {
        // Soft check — line items often exclude tax
        return {
          consistent: Math.abs(itemSum - doc.total) <= 0.05 || Math.abs(expected - doc.total) <= 0.05,
          warning:
            Math.abs(itemSum - doc.total) > 0.05
              ? `Line items sum (${itemSum.toFixed(2)}) does not match total (${doc.total})`
              : undefined,
        }
      }
    }
  }

  return { consistent: true }
}

function extractImpl(text: string, options?: { currency?: string; locale?: string }): ExtractedDocument {
  const warnings: string[] = []
  let confidence = 0.1
  const items: ExtractedItem[] = []

  if (!text || !text.trim()) {
    return {
      documentType: 'auto',
      items: [],
      confidence: 0,
      warnings: ['No text provided. OCR/PDF parsing not available — pass extracted text.'],
      missingFields: ['total', 'currency', 'date'],
      engine: 'rules',
      version: VERSION,
    }
  }

  let currency = options?.currency
  if (!currency) {
    const detected = detectCurrency(text)
    currency = detected.currency
    warnings.push(...detected.warnings)
  }
  if (currency) confidence += 0.15

  const invoiceNumberMatch = text.match(/Invoice\s*(?:No|Number|#|№)?[:\s]*([A-Za-z0-9][-A-Za-z0-9/]+)/i)
  const invoiceNumber = invoiceNumberMatch?.[1]
  if (invoiceNumber) confidence += 0.15

  const receiptNumberMatch = text.match(/Receipt\s*(?:No|Number|#)?[:\s]*([A-Za-z0-9][-A-Za-z0-9/]+)/i)
  const receiptNumber = receiptNumberMatch?.[1]
  if (receiptNumber) confidence += 0.1

  const merchantMatch = text.match(/(?:Merchant|Vendor|Seller|Store|From)[:\s]+(.+)/i)
  const merchant = merchantMatch?.[1]?.trim()
  if (merchant) confidence += 0.15

  const customerMatch = text.match(/(?:Customer|Billed\s*To|Client|Bill\s*To|To)[:\s]+(.+)/i)
  const customer = customerMatch?.[1]?.trim()
  if (customer) confidence += 0.1

  // Prefer explicit Date: label if present
  const dateLabelMatch = text.match(/(?:^|\n)\s*Date[:\s]+(.+)/i)
  const dateStr = dateLabelMatch ? parseDate(dateLabelMatch[1]) ?? parseDate(text) : parseDate(text)
  if (dateStr) {
    confidence += 0.15
  } else {
    warnings.push('Could not parse date from input')
  }

  const dueDateMatch = text.match(/Due\s*Date[:\s]+(.+)/i)
  let dueDate: string | undefined
  if (dueDateMatch) {
    dueDate = parseDate(dueDateMatch[1])
    if (dueDate) confidence += 0.1
  }

  const totalMatch = text.match(
    /\b(?:Total|Amount\s*Due|Grand\s*Total|Balance\s*Due)\b[:\s]*[$₦€£]?\s*([\d,]+\.?\d*)/i,
  )
  const total = totalMatch ? parseAmount(totalMatch[1]) : undefined
  if (total !== undefined) {
    confidence += 0.15
    if (total < 0.01) warnings.push('Unusually low total amount')
    if (total > 9_999_999) warnings.push('Unusually high total amount')
  }

  const subtotalMatch = text.match(/\b(?:Subtotal|Sub\s*Total)\b[:\s]*[$₦€£]?\s*([\d,]+\.?\d*)/i)
  const subtotal = subtotalMatch ? parseAmount(subtotalMatch[1]) : undefined
  if (subtotal !== undefined) confidence += 0.1

  const taxPercentMatch = text.match(/(?:VAT|Tax|GST)[:\s]*([\d,.]+)\s*%/i)
  let tax: number | undefined
  if (taxPercentMatch) {
    const pct = parseAmount(taxPercentMatch[1])
    if (pct !== undefined && total !== undefined && subtotal === undefined) {
      tax = Math.round(((total / (1 + pct / 100)) * (pct / 100)) * 100) / 100
    } else if (pct !== undefined && subtotal !== undefined) {
      tax = Math.round(subtotal * (pct / 100) * 100) / 100
    }
    confidence += 0.1
  } else {
    const taxAmountMatch = text.match(/(?:VAT|Tax|GST)[:\s]*[$₦€£]?\s*([\d,]+\.?\d*)/i)
    if (taxAmountMatch) {
      tax = parseAmount(taxAmountMatch[1])
      if (tax !== undefined) confidence += 0.1
    }
  }

  const discountMatch = text.match(/(?:Discount|DISCOUNT)[:\s]*[$₦€£]?\s*([\d,]+\.?\d*)/i)
  const discount = discountMatch ? parseAmount(discountMatch[1]) : undefined

  const paymentMatch = text.match(/(?:Payment\s*Method|Paid\s*Via|Payment)[:\s]+(.+)/i)
  const paymentMethod = paymentMatch?.[1]?.trim()
  if (paymentMethod) confidence += 0.05

  const lines = text.split('\n')
  let itemMode = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue
    if (
      /item|product|description|qty|quantity|price|amount/i.test(trimmed) &&
      /\b(qty|quantity|price|amount)\b/i.test(trimmed)
    ) {
      itemMode = true
      continue
    }
    if (itemMode && /^[-=+_]{3,}$/.test(trimmed)) continue
    if (itemMode && /total|subtotal|vat|tax/i.test(trimmed)) {
      itemMode = false
      continue
    }
    if (itemMode) {
      const parts = trimmed.split(/\s{2,}|\t+/)
      if (parts.length >= 2) {
        const numbers = parts.map((p) => parseAmount(p)).filter((n): n is number => n !== undefined)
        const item: ExtractedItem = { description: parts[0].trim() }
        if (numbers.length === 1) item.total = numbers[0]
        if (numbers.length === 2) {
          item.quantity = numbers[0]
          item.total = numbers[1]
        }
        if (numbers.length >= 3) {
          item.quantity = numbers[0]
          item.unitPrice = numbers[1]
          item.total = numbers[2]
        }
        items.push(item)
      }
    }
  }
  if (items.length > 0) confidence += 0.1

  const documentType: ExtractionType = receiptNumber && !invoiceNumber ? 'receipt' : 'invoice'

  const partial = {
    merchant,
    vendor: merchant,
    customer,
    invoiceNumber,
    receiptNumber,
    date: dateStr,
    dueDate,
    currency,
    subtotal,
    tax,
    discount,
    total,
    items,
  }

  const totalsCheck = checkTotalsConsistent(partial)
  if (totalsCheck.warning) warnings.push(totalsCheck.warning)

  const missingFields = computeMissingFields(
    {
      ...partial,
      documentType,
    },
    documentType,
  )
  if (missingFields.length > 0) {
    warnings.push(`Missing required fields: ${missingFields.join(', ')}`)
  }

  confidence = Math.min(confidence, 0.98)

  return {
    documentType,
    merchant,
    vendor: merchant,
    customer,
    invoiceNumber,
    receiptNumber,
    date: dateStr,
    dueDate,
    currency,
    subtotal,
    tax,
    discount,
    total,
    items,
    paymentMethod,
    confidence: Math.round(confidence * 100) / 100,
    warnings,
    missingFields,
    totalsConsistent: totalsCheck.consistent,
    engine: 'rules',
    version: VERSION,
  }
}

export function extractFromText(
  text: string,
  options?: { type?: ExtractionType; currency?: string; locale?: string },
): ExtractedDocument {
  if (!text || !text.trim()) {
    return extractImpl('', options)
  }
  const result = extractImpl(text, options)
  if (options?.type === 'invoice') return { ...result, documentType: 'invoice', missingFields: computeMissingFields(result, 'invoice') }
  if (options?.type === 'receipt') return { ...result, documentType: 'receipt', missingFields: computeMissingFields(result, 'receipt') }
  if (options?.type === 'document') return { ...result, documentType: 'document', missingFields: computeMissingFields(result, 'document') }
  return result
}

export function extractInvoiceFromText(
  text: string,
  options?: { currency?: string; locale?: string },
): ExtractedDocument {
  return extractFromText(text, { ...options, type: 'invoice' })
}

export function extractReceiptFromText(
  text: string,
  options?: { currency?: string; locale?: string },
): ExtractedDocument {
  return extractFromText(text, { ...options, type: 'receipt' })
}

export function validateFields(input: {
  documentType: string
  fields: Record<string, unknown>
}): ValidateResult {
  const docType = (input.documentType || 'invoice').toLowerCase()
  const required = REQUIRED_BY_TYPE[docType] || REQUIRED_BY_TYPE.invoice
  const missingFields: string[] = []
  const warnings: string[] = []
  const normalized: Record<string, unknown> = {}

  for (const field of required) {
    const val = input.fields[field]
    if (val === undefined || val === null || val === '') {
      missingFields.push(field)
    } else {
      normalized[field] = val
    }
  }

  // Normalize total/subtotal/tax to numbers
  for (const numField of ['total', 'subtotal', 'tax', 'discount']) {
    if (input.fields[numField] !== undefined && input.fields[numField] !== null && input.fields[numField] !== '') {
      const num = Number(input.fields[numField])
      if (!Number.isNaN(num)) {
        normalized[numField] = num
      } else {
        warnings.push(`${numField} field is not a valid number`)
        normalized[numField] = input.fields[numField]
      }
    }
  }

  for (const [key, val] of Object.entries(input.fields)) {
    if (!(key in normalized)) {
      normalized[key] = val
    }
  }

  // Totals consistency
  let totalsConsistent: boolean | undefined
  if (typeof normalized.total === 'number' && typeof normalized.subtotal === 'number') {
    const expected =
      (normalized.subtotal as number) +
      ((normalized.tax as number) ?? 0) -
      ((normalized.discount as number) ?? 0)
    const delta = Math.abs(expected - (normalized.total as number))
    totalsConsistent = delta <= 0.05
    if (!totalsConsistent) {
      warnings.push(
        `Totals mismatch: expected ${expected.toFixed(2)} from subtotal/tax/discount, got ${normalized.total}`,
      )
    }
  }

  // Negative amount check
  if (typeof normalized.total === 'number' && (normalized.total as number) < 0) {
    warnings.push('total is negative')
  }

  return {
    valid: missingFields.length === 0 && totalsConsistent !== false,
    missingFields,
    warnings,
    normalized,
    totalsConsistent,
  }
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''

  const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))]
  const escapeCell = (val: unknown): string => {
    const str = val === null || val === undefined ? '' : String(val)
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`
    }
    return str
  }

  const lines: string[] = []
  lines.push(headers.map(escapeCell).join(','))
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCell(row[h])).join(','))
  }
  return lines.join('\n')
}

export function getInvoiceLanePricing() {
  return {
    product: 'invoicelane',
    version: VERSION,
    credits: {
      'invoicelane.extract': 20,
      'invoicelane.receipt.extract': 20,
      'invoicelane.invoice.extract': 30,
      'invoicelane.validate': 10,
      'invoicelane.export.csv': 5,
    },
    note: 'Credits charged via Talocode Cloud wallet. OCR/PDF not included in v0.2.',
  }
}

export function getInvoiceLaneCapabilities() {
  return {
    product: 'invoicelane',
    version: VERSION,
    engine: 'rules',
    endpoints: [
      'GET /v1/invoicelane/health',
      'GET /v1/invoicelane/pricing',
      'GET /v1/invoicelane/capabilities',
      'POST /v1/invoicelane/extract',
      'POST /v1/invoicelane/invoice/extract',
      'POST /v1/invoicelane/receipt/extract',
      'POST /v1/invoicelane/validate',
      'POST /v1/invoicelane/export/csv',
    ],
    schema: {
      invoice: REQUIRED_BY_TYPE.invoice,
      receipt: REQUIRED_BY_TYPE.receipt,
    },
    limitations: [
      'OCR/PDF not supported — provide text input',
      'Deterministic rule engine (not ML)',
      'Single document per request',
    ],
  }
}

export class OcrNotAvailableError extends Error {
  code = 'OCR_NOT_AVAILABLE'
  constructor() {
    super('OCR/PDF parsing not available. Provide text input directly.')
    this.name = 'OcrNotAvailableError'
  }
}

export function assertTextOrOcrError(input: { text?: string; fileUrl?: string; base64?: string }): string {
  const text = typeof input.text === 'string' ? input.text : ''
  if (!text.trim() && (input.fileUrl || input.base64)) {
    throw new OcrNotAvailableError()
  }
  return text
}
