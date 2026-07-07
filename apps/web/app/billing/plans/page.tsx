'use client'

import { useEffect, useState } from 'react'
import { PageScaffold, Panel } from '@/components/app-shell'
import { apiClient } from '@/lib/api-client'
import type { CloudPricingTier } from '@/lib/api-types'
import { Zap, Eye, Camera, Globe, FileText, Layers } from 'lucide-react'

const actionIcons: Record<string, React.ComponentType<{ size?: number }>> = {
  'agent_browser.check': Zap,
  'agent_browser.screenshot': Camera,
  'agent_browser.session.create': Layers,
  'agent_browser.session.report': FileText,
  'agent_browser.session.close': Globe,
  'default': Eye,
}

export default function PlansPage() {
  const [pricing, setPricing] = useState<CloudPricingTier[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.listCloudPricing()
      .then(setPricing)
      .catch(() => setPricing([]))
      .finally(() => setLoading(false))
  }, [])

  const defaultPricing: CloudPricingTier[] = [
    { action: 'agent_browser.check', product: 'Agent Browser', credits: 1, description: 'Run a browser check on a URL' },
    { action: 'agent_browser.screenshot', product: 'Agent Browser', credits: 1, description: 'Capture a screenshot of a URL' },
    { action: 'agent_browser.extract', product: 'Agent Browser', credits: 15, description: 'Extract structured content from a URL' },
    { action: 'agent_browser.analyze', product: 'Agent Browser', credits: 25, description: 'Analyze page content with AI' },
    { action: 'agent_browser.session.create', product: 'Agent Browser', credits: 2, description: 'Create a persistent browser session' },
    { action: 'agent_browser.session.report', product: 'Agent Browser', credits: 1, description: 'Generate a session report' },
    { action: 'agent_browser.session.close', product: 'Agent Browser', credits: 0, description: 'Close a session (free)' },
  ]

  const items = pricing.length > 0 ? pricing : defaultPricing

  return (
    <PageScaffold
      title="Pricing"
      subtitle="Talocode Cloud usage-based pricing — pay per action, no monthly commitments."
      breadcrumbs={[{ label: 'Billing', href: '/billing' }, { label: 'Pricing' }]}
      actions={
        <a className="btn primary" href="/billing">
          Back to wallet
        </a>
      }
    >
      <Panel title="Per-Action Pricing">
        <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
          {items.map((tier) => {
            const Icon = actionIcons[tier.action] || actionIcons['default']
            return (
              <div
                key={tier.action}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 8,
                  border: '1px solid var(--border)', background: 'var(--panel-muted)',
                }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: 'var(--accent-soft)', display: 'grid', placeItems: 'center',
                  color: 'var(--accent)',
                }}>
                  <Icon size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>
                    {tier.action}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    {tier.description}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
                    {tier.credits}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    credits
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </Panel>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="panel">
          <h2 style={{ margin: '0 0 8px', fontSize: 13 }}>Free Starting Credits</h2>
          <div style={{ fontSize: 28, fontWeight: 700, color: '#33c38f' }}>1,000</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Every new project gets 1,000 free credits to start. No credit card required.
          </div>
        </div>
        <div className="panel">
          <h2 style={{ margin: '0 0 8px', fontSize: 13 }}>Need More?</h2>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--accent)' }}>Top Up</div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
            Minimum $100 top-up via Stripe. Credits never expire.
          </div>
          <a className="btn primary" href="/billing" style={{ marginTop: 8, display: 'inline-block' }}>
            Top up now
          </a>
        </div>
      </div>
    </PageScaffold>
  )
}
