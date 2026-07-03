'use client'

import { useEffect, useState } from 'react'
import { PageScaffold, Panel } from '@/components/app-shell'
import { apiClient, formatTimestamp } from '@/lib/api-client'
import type { CloudUsageEvent, CloudTransaction } from '@/lib/api-types'
import { Zap, Eye, Camera, Globe, FileText, Layers, ArrowUpLeft, ArrowDownLeft } from 'lucide-react'

const actionIcons: Record<string, React.ComponentType<{ size?: number; style?: React.CSSProperties }>> = {
  'agent_browser.check': Zap,
  'agent_browser.screenshot': Camera,
  'agent_browser.session.create': Layers,
  'agent_browser.session.report': FileText,
  'agent_browser.session.close': Globe,
}

export default function UsageBillingPage() {
  const [events, setEvents] = useState<CloudUsageEvent[]>([])
  const [transactions, setTransactions] = useState<CloudTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'usage' | 'transactions'>('usage')

  useEffect(() => {
    apiClient.listProjects()
      .then((projects) => {
        if (projects.length === 0) {
          setLoading(false)
          return
        }
        const pid = projects[0].id
        return Promise.all([
          apiClient.listCloudUsageEvents(pid).catch(() => [] as CloudUsageEvent[]),
          apiClient.listCloudTransactions(pid, 100).catch(() => [] as CloudTransaction[]),
        ])
      })
      .then((result) => {
        if (!result) return
        const evts = result[0] as CloudUsageEvent[]
        const txs = result[1] as CloudTransaction[]
        setEvents(evts)
        setTransactions(txs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  return (
    <PageScaffold
      title="Usage & Billing"
      subtitle="Detailed usage events and wallet transaction history."
      breadcrumbs={[{ label: 'Billing', href: '/billing' }, { label: 'Usage' }]}
      actions={
        <a className="btn primary" href="/billing">
          Back to wallet
        </a>
      }
    >
      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
        <button
          className={`btn ${tab === 'usage' ? 'primary' : ''}`}
          onClick={() => setTab('usage')}
        >
          Usage Events
        </button>
        <button
          className={`btn ${tab === 'transactions' ? 'primary' : ''}`}
          onClick={() => setTab('transactions')}
        >
          Transactions
        </button>
      </div>

      {tab === 'usage' ? (
        <Panel title="Usage Events">
          {loading ? (
            <div className="table-state"><strong>Loading...</strong></div>
          ) : events.length === 0 ? (
            <div className="table-state">
              <strong>No usage events yet</strong>
              <p>Usage events appear here once you start using Talocode Cloud services.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Product</th>
                  <th>Action</th>
                  <th>Credits</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {events.map((evt) => {
                  const Icon = actionIcons[evt.action] || Eye
                  return (
                    <tr key={evt.id}>
                      <td><span className="timestamp">{formatTimestamp(evt.createdAt)}</span></td>
                      <td>{evt.product}</td>
                      <td>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <Icon size={12} style={{ color: 'var(--text-muted)' }} />
                          {evt.action}
                        </span>
                      </td>
                      <td style={{ color: '#ef6b6b', fontWeight: 600 }}>-{evt.credits}</td>
                      <td>
                        <span className={`status ${evt.status === 'succeeded' ? 'healthy' : 'warning'}`}>
                          {evt.status}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Panel>
      ) : (
        <Panel title="Wallet Transactions">
          {loading ? (
            <div className="table-state"><strong>Loading...</strong></div>
          ) : transactions.length === 0 ? (
            <div className="table-state">
              <strong>No transactions yet</strong>
              <p>Top up your wallet or use Talocode Cloud services to see transactions.</p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Type</th>
                  <th>Reference</th>
                  <th>Credits</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => (
                  <tr key={txn.id}>
                    <td><span className="timestamp">{formatTimestamp(txn.createdAt)}</span></td>
                    <td>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, textTransform: 'capitalize' }}>
                        {txn.type === 'topup' || txn.type === 'grant' ? (
                          <ArrowUpLeft size={12} style={{ color: '#33c38f' }} />
                        ) : (
                          <ArrowDownLeft size={12} style={{ color: '#ef6b6b' }} />
                        )}
                        {txn.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 11 }}>{txn.reference || txn.product || '-'}</td>
                    <td style={{ color: txn.creditsDelta > 0 ? '#33c38f' : '#ef6b6b', fontWeight: 600 }}>
                      {txn.creditsDelta > 0 ? '+' : ''}{txn.creditsDelta.toLocaleString()}
                    </td>
                    <td style={{ fontWeight: 600 }}>{txn.balanceAfter.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      )}
    </PageScaffold>
  )
}
