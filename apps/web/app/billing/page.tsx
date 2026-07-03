'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PageScaffold, Panel, MetaChip } from '@/components/app-shell'
import { apiClient, formatTimestamp } from '@/lib/api-client'
import type { CloudWallet, CloudTransaction } from '@/lib/api-types'
import { Wallet, ArrowUpLeft, ArrowDownLeft, Plus, CreditCard } from 'lucide-react'

export default function BillingOverviewPage() {
  const router = useRouter()
  const [wallet, setWallet] = useState<CloudWallet | null>(null)
  const [transactions, setTransactions] = useState<CloudTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [projectId, setProjectId] = useState<string | null>(null)
  const [topupAmount, setTopupAmount] = useState('')

  useEffect(() => {
    apiClient.listProjects()
      .then((projects) => {
        if (projects.length === 0) {
          setLoading(false)
          return
        }
        const pid = projects[0].id
        setProjectId(pid)
        return Promise.all([
          apiClient.getCloudWallet(pid).catch(() => null),
          apiClient.listCloudTransactions(pid).catch(() => [] as CloudTransaction[]),
        ])
      })
      .then((result) => {
        if (!result) return
        const w = result[0] as CloudWallet | null
        const txs = result[1] as CloudTransaction[]
        if (w) setWallet(w)
        setTransactions(txs)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleTopup() {
    const amount = Number(topupAmount)
    if (!projectId || !amount || amount < 100) return
    const result = await apiClient.createCloudTopup(projectId, amount)
    if (result.clientSecret && result.stripePublishableKey) {
      router.push(`/billing/top-up?clientSecret=${result.clientSecret}&publishableKey=${result.stripePublishableKey}`)
    } else {
      // Manual topup path (dev/test)
      await apiClient.confirmCloudTopup(projectId, result.topup.id)
      window.location.reload()
    }
  }

  if (loading) {
    return (
      <PageScaffold title="Billing" subtitle="Loading wallet..." breadcrumbs={[{ label: 'Billing' }]}>
        <div className="table-state"><strong>Loading...</strong></div>
      </PageScaffold>
    )
  }

  const balance = wallet?.balance ?? 0
  const txnCount = transactions.length

  return (
    <PageScaffold
      title="Billing"
      subtitle="Talocode Cloud prepaid wallet — credits, top-ups, and usage history."
      breadcrumbs={[{ label: 'Billing' }]}
      metadata={
        <>
          <MetaChip label="Balance" value={`${balance.toLocaleString()} credits`} />
          <MetaChip label="Transactions" value={String(txnCount)} />
          {wallet && <MetaChip label="Lifetime spend" value={`${wallet.lifetimeSpend.toLocaleString()} credits`} />}
        </>
      }
      actions={
        <a className="btn primary" href="/billing/plans">
          <CreditCard size={14} style={{ marginRight: 4 }} />
          View pricing
        </a>
      }
    >
      {/* Wallet Balance Card */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="panel" style={{ background: 'linear-gradient(135deg, #1e3a5f, #1b212b)', border: '1px solid #2a4a7a' }}>
          <div className="panel-head">
            <h2 style={{ color: '#dbe8ff' }}>Wallet Balance</h2>
            <Wallet size={20} style={{ color: '#4f8cff' }} />
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#eef3ff', margin: '8px 0' }}>
            {balance.toLocaleString()}
            <span style={{ fontSize: 14, fontWeight: 400, color: '#8794a8', marginLeft: 8 }}>credits</span>
          </div>
          {wallet && (
            <div style={{ fontSize: 11, color: '#8794a8' }}>
              Lifetime: {wallet.lifetimeCredits.toLocaleString()} credits · {wallet.freeCreditsGranted ? 'Includes free grant' : 'No free grant'}
            </div>
          )}
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Quick Top-Up</h2>
            <Plus size={16} style={{ color: '#8794a8' }} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <input
              type="number"
              min={100}
              step={100}
              placeholder="Amount ($)"
              value={topupAmount}
              onChange={(e) => setTopupAmount(e.target.value)}
              style={{
                flex: 1, minHeight: 34, borderRadius: 8, border: '1px solid var(--border)',
                background: '#141a23', color: '#eef3ff', padding: '7px 10px', fontSize: 13,
              }}
            />
            <button
              className="btn primary"
              onClick={handleTopup}
              disabled={!projectId || Number(topupAmount) < 100}
              style={{ whiteSpace: 'nowrap' }}
            >
              <CreditCard size={14} style={{ marginRight: 4 }} />
              Top Up
            </button>
          </div>
          <div style={{ fontSize: 10, color: '#8794a8', marginTop: 6 }}>Minimum $100.00. Powered by Stripe.</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <Panel
        title="Recent Transactions"
        actions={
          <a className="btn ghost" href="/billing/usage" style={{ fontSize: 11 }}>
            View all usage
          </a>
        }
      >
        {transactions.length === 0 ? (
          <div className="table-state">
            <strong>No transactions yet</strong>
            <p>Top up your wallet to get started.</p>
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Product</th>
                <th>Credits</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {transactions.slice(0, 20).map((txn) => (
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
                  <td style={{ color: 'var(--text-muted)' }}>{txn.product || txn.action || '-'}</td>
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
    </PageScaffold>
  )
}
