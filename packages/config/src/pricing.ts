export const TALOCODE_CLOUD_PRICING = {
  creditUsdValue: 0.01,
  freeStartingCredits: 100,
  minimumTopUpCredits: 500,
  products: {
    agent_browser: {
      "browser.check": 5,
      "browser.screenshot": 8,
      "browser.evidence": 8,
      "browser.trace_report": 15
    },
    tera_context: {
      "context.capture": 5,
      "context.summarize": 10
    },
    talocode_reach: {
      "web.read": 3,
      "search.query": 3,
      "github.read": 3,
      "rss.read": 2
    },
    cliploop: {
      "brief.generate": 15,
      "script.generate": 15,
      "video.render": 200,
      "campaign.package": 400
    },
    signallane: {
      "signal.detect": 5,
      "lead.score": 8,
      "followup.generate": 8
    },
    tradia: {
      "trade.import": 3,
      "performance.analyze": 20,
      "risk.report": 35,
      "behavior.report": 35
    },
    codra: {
      "repo.summary": 15,
      "task.small": 40,
      "task.large": 150
    },
    worklane: {
      "workflow.small": 15,
      "workflow.large": 40
    },
    talocode_router: {
      "chat.fast": 3,
      "chat.auto": 5,
      "chat.coding": 8,
      "chat.completions": 2,
      "compression.logs": 2,
      "compression.diff": 2,
      "compression.trace": 3
    }
  }
} as const

export function getPricingForAction(product: string, action: string): number | null {
  const productPricing = (TALOCODE_CLOUD_PRICING.products as Record<string, Record<string, number>>)[product]
  if (!productPricing) return null
  return productPricing[action] ?? null
}

export function listAllPricing() {
  return TALOCODE_CLOUD_PRICING
}
