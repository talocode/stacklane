export const TALOCODE_CLOUD_PRICING = {
  creditUsdValue: 0.01,
  freeStartingCredits: 100,
  minimumTopUpCredits: 500,
  products: {
    agent_browser: {
      "browser.check": 2,
      "browser.screenshot": 3,
      "browser.evidence": 3,
      "browser.trace_report": 5
    },
    tera_context: {
      "context.capture": 2,
      "context.summarize": 5
    },
    talocode_reach: {
      "web.read": 2,
      "search.query": 2,
      "github.read": 2,
      "rss.read": 1
    },
    cliploop: {
      "brief.generate": 10,
      "script.generate": 10,
      "video.render": 150,
      "campaign.package": 300
    },
    signallane: {
      "signal.detect": 3,
      "lead.score": 5,
      "followup.generate": 5
    },
    tradia: {
      "trade.import": 2,
      "performance.analyze": 15,
      "risk.report": 25,
      "behavior.report": 25
    },
    codra: {
      "repo.summary": 10,
      "task.small": 25,
      "task.large": 100
    },
    worklane: {
      "workflow.small": 10,
      "workflow.large": 25
    },
    talocode_router: {
      "chat.fast": 2,
      "chat.auto": 3,
      "chat.coding": 5,
      "compression.logs": 1,
      "compression.diff": 1,
      "compression.trace": 2
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
