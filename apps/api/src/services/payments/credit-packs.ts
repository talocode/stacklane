import { HttpError } from '../../http'

export type CreditPack = {
  id: string
  credits: number
  amountCents: number
  variantId: string
}

// Pack values are fixed in code; deployment configuration supplies only their
// corresponding provider variant IDs through LEMONSQUEEZY_VARIANT_MAP.
const PACKS = [
  ['starter', 500],
  ['builder', 1000],
  ['growth', 2500],
  ['scale', 5000],
  ['pro', 10000],
  ['studio', 25000],
] as const

function variantMap(): Record<string, string> {
  try {
    const parsed = JSON.parse(process.env.LEMONSQUEEZY_VARIANT_MAP || '{}') as Record<string, unknown>
    const variants: Record<string, string> = {}
    for (const [credits, value] of Object.entries(parsed)) {
      if (typeof value === 'string' && value.length > 0) variants[credits] = value
    }
    return variants
  } catch {
    throw new HttpError(500, 'LEMONSQUEEZY_NOT_CONFIGURED', 'LEMONSQUEEZY_VARIANT_MAP must be valid JSON.')
  }
}

export function getCreditPack(packId: string): CreditPack {
  const match = PACKS.find(([id]) => id === packId)
  if (!match) throw new HttpError(422, 'INVALID_PACK', 'packId is not a supported credit pack.')
  const [, credits] = match
  const variantId = variantMap()[String(credits)]
  if (!variantId) throw new HttpError(500, 'LEMONSQUEEZY_NOT_CONFIGURED', `No configured variant for ${packId}.`)
  return { id: packId, credits, amountCents: credits, variantId }
}

export function listCreditPacks(): Array<Omit<CreditPack, 'variantId'>> {
  return PACKS.map(([id, credits]) => ({ id, credits, amountCents: credits }))
}
