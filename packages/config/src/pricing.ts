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
      "campaign.create": 50,
      "campaign.package": 400
    },
    signallane: {
      "signallane.x.analyze": 30,
      "signallane.x.content_plan": 40,
      "signallane.x.post_drafts": 40,
      "signallane.x.experiments": 30,
      "signallane.x.report": 60
    },
    tradia: {
      "trade.import": 3,
      "performance.analyze": 20,
      "risk.report": 35,
      "behavior.report": 35
    },
    codra: {
      "repo.summary": 50,
      "explain": 20,
      "review": 40,
      "plan": 40
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
    },
    skills: {
      "generate.github_profile": 80,
      "generate.github_repo": 100,
      "generate.docs": 100,
      "generate.text": 40,
      "export.cursor": 10,
      "export.claude": 10
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
