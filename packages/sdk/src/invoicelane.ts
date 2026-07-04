import { TalocodeApiClient } from './talocode.js'

export interface InvoiceLaneExtractInput {
  type?: 'invoice' | 'receipt' | 'document' | 'auto'
  text?: string
  fileUrl?: string
  base64?: string
  currency?: string
  locale?: string
  fields?: string[]
}

export interface InvoiceLaneReceiptInput {
  text?: string
  fileUrl?: string
  base64?: string
  currency?: string
  locale?: string
}

export interface InvoiceLaneInvoiceInput {
  text?: string
  fileUrl?: string
  base64?: string
  currency?: string
  locale?: string
}

export interface InvoiceLaneValidateInput {
  documentType: string
  fields: Record<string, unknown>
}

export interface InvoiceLaneExportCsvInput {
  rows: Record<string, unknown>[]
}

export interface InvoiceLaneResponse<T> {
  data: T
  usage: {
    action: string
    credits: number
    remaining: number
  }
}

export class InvoiceLaneClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string }> {
    const res = await this.api.request('/v1/invoicelane/health')
    return res as { ok: boolean; service: string; version: string }
  }

  async extract(input: InvoiceLaneExtractInput): Promise<InvoiceLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/invoicelane/extract', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<InvoiceLaneResponse<Record<string, unknown>>>
  }

  async receiptExtract(input: InvoiceLaneReceiptInput): Promise<InvoiceLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/invoicelane/receipt/extract', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<InvoiceLaneResponse<Record<string, unknown>>>
  }

  async invoiceExtract(input: InvoiceLaneInvoiceInput): Promise<InvoiceLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/invoicelane/invoice/extract', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<InvoiceLaneResponse<Record<string, unknown>>>
  }

  async validate(input: InvoiceLaneValidateInput): Promise<InvoiceLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/invoicelane/validate', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<InvoiceLaneResponse<Record<string, unknown>>>
  }

  async exportCsv(input: InvoiceLaneExportCsvInput): Promise<InvoiceLaneResponse<Record<string, unknown>>> {
    return this.api.request('/v1/invoicelane/export/csv', {
      method: 'POST',
      body: input as unknown as Record<string, unknown>,
    }) as Promise<InvoiceLaneResponse<Record<string, unknown>>>
  }
}
