import { TalocodeApiClient } from './talocode.js'

export interface ForgeCADDimensions {
  length?: number
  width?: number
  height?: number
  thickness?: number
  unit?: string
}

export interface ForgeCADGenerateDesignInput {
  projectType: string
  description?: string
  dimensions?: ForgeCADDimensions
  manufacturingMethod?: string
  material?: string
  requirements?: string[]
  constraints?: Record<string, unknown>
}

export interface ForgeCADOpenScadInput {
  projectType: string
  dimensions?: ForgeCADDimensions
  features?: string[]
  manufacturingMethod?: string
  material?: string
}

export interface ForgeCADBomInput {
  projectType?: string
  parts?: Array<{ name: string; quantity?: number }>
  fasteners?: string[]
  material?: string
}

export interface ForgeCADCutListInput {
  projectType?: string
  dimensions?: ForgeCADDimensions
  material?: string
  members?: Array<{ name: string; length?: number; width?: number; quantity?: number }>
}

export interface ForgeCADAssemblyInput {
  projectType?: string
  parts?: Array<{ name: string }>
  design?: Record<string, unknown>
}

export interface ForgeCADPrintabilityInput {
  manufacturingMethod?: string
  material?: string
  dimensions?: ForgeCADDimensions
  features?: string[]
  constraints?: Record<string, unknown>
}

export interface ForgeCADManufacturabilityInput {
  manufacturingMethod?: string
  material?: string
  dimensions?: ForgeCADDimensions
  features?: string[]
}

export interface ForgeCADReviewInput {
  design?: Record<string, unknown>
  requirements?: string[]
  manufacturingMethod?: string
}

export interface ForgeCADMaterialInput {
  projectType?: string
  dimensions?: ForgeCADDimensions
  material?: string
  manufacturingMethod?: string
}

export interface ForgeCADRenderInput {
  code: string
  format?: string
  filename?: string
}

export interface ForgeCADExportInput {
  data?: Record<string, unknown>
  design?: Record<string, unknown>
  title?: string
}

export interface ForgeCADResponse<T> {
  result?: T
  usage: { action: string; credits: number; remaining?: number }
}

export class ForgeCADClient {
  private api: TalocodeApiClient

  constructor(api: TalocodeApiClient) {
    this.api = api
  }

  async health(): Promise<{ ok: boolean; service: string; version: string; product: string; status: string }> {
    return this.api.request('/v1/forgecad/health') as Promise<{ ok: boolean; service: string; version: string; product: string; status: string }>
  }

  design = {
    generate: async (input: ForgeCADGenerateDesignInput) =>
      this.api.request('/v1/forgecad/design/generate', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
    review: async (input: ForgeCADReviewInput) =>
      this.api.request('/v1/forgecad/design/review', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  openscad = {
    generate: async (input: ForgeCADOpenScadInput) =>
      this.api.request('/v1/forgecad/openscad/generate', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  bom = {
    generate: async (input: ForgeCADBomInput) =>
      this.api.request('/v1/forgecad/bom/generate', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  cutList = {
    generate: async (input: ForgeCADCutListInput) =>
      this.api.request('/v1/forgecad/cutlist/generate', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  assembly = {
    plan: async (input: ForgeCADAssemblyInput) =>
      this.api.request('/v1/forgecad/assembly/plan', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  printability = {
    check: async (input: ForgeCADPrintabilityInput) =>
      this.api.request('/v1/forgecad/printability/check', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  manufacturability = {
    check: async (input: ForgeCADManufacturabilityInput) =>
      this.api.request('/v1/forgecad/manufacturability/check', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  material = {
    estimate: async (input: ForgeCADMaterialInput) =>
      this.api.request('/v1/forgecad/material/estimate', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  tools = {
    detect: async () =>
      this.api.request('/v1/forgecad/tools/detect', { method: 'POST', body: {} }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  render = {
    openscad: async (input: ForgeCADRenderInput) =>
      this.api.request('/v1/forgecad/render/openscad', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }

  export = {
    markdown: async (input: ForgeCADExportInput) =>
      this.api.request('/v1/forgecad/export/markdown', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
    json: async (input: ForgeCADExportInput) =>
      this.api.request('/v1/forgecad/export/json', { method: 'POST', body: input as unknown as Record<string, unknown> }) as Promise<ForgeCADResponse<Record<string, unknown>>>,
  }
}