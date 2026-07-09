import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  extractFromText,
  extractInvoiceFromText,
  extractReceiptFromText,
  validateFields,
  toCsv,
  getInvoiceLanePricing,
  getInvoiceLaneCapabilities,
  assertTextOrOcrError,
  OcrNotAvailableError,
} from '../src/services/invoicelane.js'

void describe('invoicelane service', () => {
  void describe('extractFromText', () => {
    void it('extracts full invoice with schema fields', () => {
      const invoice = `Invoice No: INV-001
Merchant: ABC Ltd
Date: 2026-07-04
Due Date: 2026-08-04
Customer: John Doe
Subtotal: $1,000.00
Tax: 7.5%
Total: $1,075.00
Payment Method: Credit Card`

      const result = extractFromText(invoice, { type: 'invoice' })
      assert.equal(result.documentType, 'invoice')
      assert.equal(result.invoiceNumber, 'INV-001')
      assert.equal(result.merchant, 'ABC Ltd')
      assert.equal(result.vendor, 'ABC Ltd')
      assert.equal(result.date, '2026-07-04')
      assert.equal(result.dueDate, '2026-08-04')
      assert.equal(result.customer, 'John Doe')
      assert.equal(result.subtotal, 1000)
      assert.equal(result.total, 1075)
      assert.equal(result.currency, 'USD')
      assert.ok(result.confidence > 0.7)
      assert.equal(result.engine, 'rules')
      assert.equal(result.version, '0.2.0')
      assert.deepEqual(result.missingFields, [])
      assert.equal(result.totalsConsistent, true)
    })

    void it('extracts receipt', () => {
      const receipt = `Receipt #12345
Store: Corner Shop
Date: 2026-07-04
Total: $25.50`

      const result = extractFromText(receipt, { type: 'receipt' })
      assert.equal(result.documentType, 'receipt')
      assert.equal(result.receiptNumber, '12345')
      assert.equal(result.merchant, 'Corner Shop')
      assert.equal(result.total, 25.5)
      assert.deepEqual(result.missingFields, [])
    })

    void it('reports missing fields for sparse input', () => {
      const result = extractFromText('hello world', { type: 'invoice' })
      assert.ok(result.missingFields.includes('total'))
      assert.ok(result.missingFields.includes('currency') || result.missingFields.includes('invoiceNumber'))
      assert.ok(result.warnings.some((w) => w.toLowerCase().includes('missing')))
    })

    void it('empty text returns OCR-oriented warning', () => {
      const result = extractFromText('')
      assert.equal(result.confidence, 0)
      assert.ok(result.warnings.length > 0)
      assert.ok(result.missingFields.length > 0)
    })

    void it('flags totals mismatch', () => {
      const text = `Invoice No: INV-99
Merchant: Bad Math Co
Date: 2026-07-04
Subtotal: $100.00
Tax: $10.00
Total: $999.00`
      const result = extractFromText(text, { type: 'invoice', currency: 'USD' })
      assert.equal(result.totalsConsistent, false)
      assert.ok(result.warnings.some((w) => w.toLowerCase().includes('mismatch')))
    })
  })

  void describe('extractInvoiceFromText / extractReceiptFromText', () => {
    void it('forces invoice documentType', () => {
      const result = extractInvoiceFromText('Invoice No: INV-001\nDate: 2026-07-04\nTotal: $1,234.56')
      assert.equal(result.documentType, 'invoice')
      assert.equal(result.invoiceNumber, 'INV-001')
      assert.equal(result.total, 1234.56)
    })

    void it('forces receipt documentType', () => {
      const result = extractReceiptFromText('Receipt #RCP-001\nDate: 2026-07-04\nTotal: $50')
      assert.equal(result.documentType, 'receipt')
      assert.equal(result.receiptNumber, 'RCP-001')
    })

    void it('parses date formats', () => {
      assert.equal(extractInvoiceFromText('Invoice-1\nDate: 2026-07-04\nTotal: $100').date, '2026-07-04')
      assert.equal(extractInvoiceFromText('Invoice-2\nDate: 07/04/2026\nTotal: $100').date, '2026-07-04')
      assert.equal(extractInvoiceFromText('Invoice-3\nDate: 4 July 2026\nTotal: $100').date, '2026-07-04')
    })
  })

  void describe('validateFields', () => {
    void it('validates complete invoice', () => {
      const result = validateFields({
        documentType: 'invoice',
        fields: {
          invoiceNumber: 'INV-1',
          total: 100,
          currency: 'USD',
          date: '2026-07-04',
          subtotal: 90,
          tax: 10,
        },
      })
      assert.equal(result.valid, true)
      assert.deepEqual(result.missingFields, [])
      assert.equal(result.totalsConsistent, true)
      assert.equal(result.normalized.total, 100)
    })

    void it('fails on missing required fields', () => {
      const result = validateFields({
        documentType: 'invoice',
        fields: { total: 50 },
      })
      assert.equal(result.valid, false)
      assert.ok(result.missingFields.includes('invoiceNumber'))
      assert.ok(result.missingFields.includes('currency'))
      assert.ok(result.missingFields.includes('date'))
    })

    void it('fails on totals mismatch', () => {
      const result = validateFields({
        documentType: 'invoice',
        fields: {
          invoiceNumber: 'X',
          total: 999,
          currency: 'USD',
          date: '2026-01-01',
          subtotal: 100,
          tax: 10,
        },
      })
      assert.equal(result.valid, false)
      assert.equal(result.totalsConsistent, false)
    })
  })

  void describe('toCsv', () => {
    void it('generates CSV with headers', () => {
      const csv = toCsv([
        { merchant: 'A', total: 10 },
        { merchant: 'B', total: 20 },
      ])
      assert.ok(csv.includes('merchant'))
      assert.ok(csv.includes('total'))
      assert.ok(csv.includes('A'))
    })

    void it('escapes commas and quotes', () => {
      const csv = toCsv([{ name: 'Acme, Inc', note: 'said "hi"' }])
      assert.ok(csv.includes('"Acme, Inc"'))
      assert.ok(csv.includes('""hi""'))
    })

    void it('empty rows returns empty string', () => {
      assert.equal(toCsv([]), '')
    })
  })

  void describe('assertTextOrOcrError', () => {
    void it('returns text when present', () => {
      assert.equal(assertTextOrOcrError({ text: 'hello' }), 'hello')
    })

    void it('throws OCR_NOT_AVAILABLE for fileUrl without text', () => {
      assert.throws(
        () => assertTextOrOcrError({ fileUrl: 'https://example.com/inv.pdf' }),
        (err: unknown) => err instanceof OcrNotAvailableError,
      )
    })
  })

  void describe('pricing and capabilities', () => {
    void it('lists credit costs', () => {
      const pricing = getInvoiceLanePricing()
      assert.equal(pricing.product, 'invoicelane')
      assert.equal(pricing.credits['invoicelane.extract'], 20)
      assert.equal(pricing.credits['invoicelane.invoice.extract'], 30)
    })

    void it('lists capabilities and schema', () => {
      const caps = getInvoiceLaneCapabilities()
      assert.equal(caps.product, 'invoicelane')
      assert.ok(caps.endpoints.some((e) => e.includes('/extract')))
      assert.ok(caps.schema.invoice.includes('total'))
    })
  })
})
