export class TalocodeError extends Error {
  public status: number
  public code: string
  public requestId?: string

  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message)
    this.name = 'TalocodeError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}

export class TalocodeAuthError extends TalocodeError {
  constructor(message: string, requestId?: string) {
    super(message, 401, 'auth_error', requestId)
    this.name = 'TalocodeAuthError'
  }
}

export class TalocodeInsufficientCreditsError extends TalocodeError {
  public required?: number
  public available?: number

  constructor(message: string, required?: number, available?: number, requestId?: string) {
    super(message, 402, 'insufficient_credits', requestId)
    this.name = 'TalocodeInsufficientCreditsError'
    this.required = required
    this.available = available
  }
}

export class TalocodeRateLimitError extends TalocodeError {
  constructor(message: string, requestId?: string) {
    super(message, 429, 'rate_limit', requestId)
    this.name = 'TalocodeRateLimitError'
  }
}

export class TalocodeValidationError extends TalocodeError {
  public details?: Record<string, unknown>

  constructor(message: string, details?: Record<string, unknown>, requestId?: string) {
    super(message, 400, 'validation_error', requestId)
    this.name = 'TalocodeValidationError'
    this.details = details
  }
}

export class TalocodeNotImplementedError extends TalocodeError {
  constructor(namespace: string, method: string) {
    super(`${namespace}.${method} is not yet implemented.`, 0, 'not_implemented')
    this.name = 'TalocodeNotImplementedError'
  }
}
