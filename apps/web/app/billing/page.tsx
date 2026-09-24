'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MetaChip, PageScaffold, Panel } from '@/components/app-shell'
import { TcodeHoldPanel } from '@/components/tcode-hold-panel'
import { apiClient } from '@/lib/api-client'
import { formatCredits, formatTimestamp, formatUsdFromCredits } from '@/lib/format'
import type { CloudCreditPack, CloudTransaction, CloudWallet, Project, TcodePurchaseQuote } from '@/lib/api-types'

export default function BillingPage() {
  const router = useRouter()
  const [projects, setProjects] = useState<Project[]>([])
  const [projectId, setProjectId] = useState('')
  const [wallet, setWallet] = useState<CloudWallet | null>(null)
  const [txns, setTxns] = useState<CloudTransaction[]>([])
  const [packs, setPacks] = useState<CloudCreditPack[]>([])
  const [selectedPackId, setSelectedPackId] = useState('starter')
  const [method, setMethod] = useState<'card' | 'tcode'>('card')
  const [quote, setQuote] = useState<TcodePurchaseQuote | null>(null)
  const [signature, setSignature] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const selectedPack = packs.find((p) => p.id === selectedPackId) || null

  useEffect(() => {
    apiClient
      .listProjects()
      .then((list) => {
        setProjects(list)
        if (list[0]) setProjectId(list[0].id)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    apiClient
      .listCreditPacks()
      .then((options) => setPacks(options.packs))
      .catch((e) => setError((e as Error).message))
  }, [])

  useEffect(() => {
    if (!projectId) return
    setError(null)
    Promise.all([
      apiClient.getCloudWallet(projectId),
      apiClient.listCloudTransactions(projectId, 50),
    ])
      .then(([w, t]) => {
        setWallet(w)
        setTxns(t)
      })
      .catch((e) => setError((e as Error).message))
  }, [projectId])

  function reloadWallet() {
    if (!projectId) return
    Promise.all([
      apiClient.getCloudWallet(projectId),
      apiClient.listCloudTransactions(projectId, 50),
    ])
      .then(([w, t]) => {
        setWallet(w)
        setTxns(t)
      })
      .catch((e) => setError((e as Error).message))
  }

  async function payByCard() {
    if (!projectId || !selectedPack) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await apiClient.createCloudTopupPack(projectId, selectedPack.id)
      if (result.checkoutUrl) {
        window.location.assign(result.checkoutUrl)
        return
      }
      if (result.clientSecret && result.stripePublishableKey) {
        router.push(
          `/billing/top-up?clientSecret=${encodeURIComponent(result.clientSecret)}&publishableKey=${encodeURIComponent(result.stripePublishableKey)}`,
        )
        return
      }
      setError('Checkout is not available for this pack. Please try again later.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function requestTcodeQuote() {
    if (!projectId || !selectedPack) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      setQuote(await apiClient.createTcodeQuote(projectId, selectedPack.id))
      setSignature('')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function submitTcodePayment() {
    if (!projectId || !quote || !signature.trim()) return
    setBusy(true)
    setError(null)
    setNotice(null)
    try {
      const result = await apiClient.completeTcodePurchase({
        projectId,
        quoteId: quote.quoteId,
        signature: signature.trim(),
      })
      setNotice(
        result.alreadyCredited
          ? 'That transaction was already credited. Nothing further was added.'
          : `Credited ${formatCredits(result.credits)} credits.`,
      )
      setQuote(null)
      setSignature('')
      reloadWallet()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageScaffold
      title="Wallet"
      subtitle="Prepaid credits for Talocode Cloud APIs. 1 credit = $0.01 USD."
      breadcrumbs={[{ label: 'Wallet' }]}
      metadata={
        wallet ? (
          <>
            <MetaChip label="Balance" value={formatCredits(wallet.balance)} />
            <MetaChip label="USD" value={formatUsdFromCredits(wallet.balance)} />
          </>
        ) : null
      }
      actions={
        <Link className="btn" href="/billing/plans">
          View pricing
        </Link>
      }
    >
      {error ? <div className="alert error">{error}</div> : null}
      {notice ? <div className="alert success">{notice}</div> : null}

      <div className="grid-3">
        <div className="stat-card">
          <p className="label">Balance</p>
          <p className="value">{wallet ? formatCredits(wallet.balance) : loading ? '…' : '—'}</p>
          <p className="hint">{wallet ? formatUsdFromCredits(wallet.balance) : '—'}</p>
        </div>
        <div className="stat-card">
          <p className="label">Lifetime credited</p>
          <p className="value">{wallet ? formatCredits(wallet.lifetimeCredits) : '—'}</p>
          <p className="hint">Grants + top-ups</p>
        </div>
        <div className="stat-card">
          <p className="label">Lifetime spend</p>
          <p className="value">{wallet ? formatCredits(wallet.lifetimeSpend) : '—'}</p>
          <p className="hint">API usage charges</p>
        </div>
      </div>

      <TcodeHoldPanel projectId={projectId} onClaimed={reloadWallet} />

      <div className="grid-2">
        <Panel title="Top up">
          <div className="field">
            <label htmlFor="project">Project wallet</label>
            <select id="project" value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {projects.length === 0 ? <option value="">No projects</option> : null}
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Credit pack</label>
            <div className="actions">
              {packs.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={p.id === selectedPackId ? 'btn primary' : 'btn'}
                  onClick={() => {
                    setSelectedPackId(p.id)
                    setQuote(null)
                  }}
                >
                  {p.credits.toLocaleString()} cr · {formatUsdFromCredits(p.credits)}
                </button>
              ))}
            </div>
            {packs.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>Loading packs…</p>
            ) : null}
          </div>

          <div className="field">
            <label>Payment method</label>
            <div className="actions">
              <button
                type="button"
                className={method === 'card' ? 'btn primary' : 'btn'}
                disabled={!selectedPack?.methods.card.available}
                onClick={() => {
                  setMethod('card')
                  setQuote(null)
                }}
              >
                Card
              </button>
              <button
                type="button"
                className={method === 'tcode' ? 'btn primary' : 'btn'}
                disabled={!selectedPack?.methods.tcode.available}
                onClick={() => {
                  setMethod('tcode')
                  setQuote(null)
                }}
              >
                $TCODE
              </button>
            </div>
          </div>

          {method === 'card' ? (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 0 }}>
                {selectedPack
                  ? `Pay ${formatUsdFromCredits(selectedPack.credits)} for ${selectedPack.credits.toLocaleString()} credits.`
                  : 'Select a pack to continue.'}
              </p>
              <button
                className="btn primary"
                type="button"
                disabled={busy || !projectId || !selectedPack}
                onClick={() => void payByCard()}
              >
                {busy ? 'Starting checkout…' : 'Pay by card'}
              </button>
            </>
          ) : quote ? (
            <>
              <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                Send exactly <strong>{quote.tcodeTokens} $TCODE</strong> from your linked wallet to:
              </p>
              <p className="mono" style={{ fontSize: 12, wordBreak: 'break-all', marginTop: 0 }}>
                {quote.treasuryAddress}
              </p>
              <p style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                The quote is held until {formatTimestamp(quote.expiresAt)}. Then paste the transaction
                signature below.
              </p>
              <div className="field">
                <label htmlFor="signature">Transaction signature</label>
                <input
                  id="signature"
                  value={signature}
                  onChange={(e) => setSignature(e.target.value)}
                  placeholder="Paste the signature from your wallet"
                />
              </div>
              <button
                className="btn primary"
                type="button"
                disabled={busy || !signature.trim()}
                onClick={() => void submitTcodePayment()}
              >
                {busy ? 'Verifying…' : 'I have sent it, credit my wallet'}
              </button>
            </>
          ) : (
            <>
              <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 0 }}>
                {selectedPack?.methods.tcode.tokens
                  ? `You will send about ${selectedPack.methods.tcode.tokens} $TCODE. The exact amount is fixed when you request a quote.`
                  : 'Select a pack to continue.'}
              </p>
              <button
                className="btn primary"
                type="button"
                disabled={busy || !projectId || !selectedPack || !selectedPack.methods.tcode.available}
                onClick={() => void requestTcodeQuote()}
              >
                {busy ? 'Pricing…' : 'Get $TCODE amount'}
              </button>
            </>
          )}
        </Panel>

        <Panel title="How billing works">
          <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--text-secondary)', display: 'grid', gap: 8 }}>
            <li>New wallets receive 100 free credits ($1).</li>
            <li>Minimum top-up is 500 credits ($5).</li>
            <li>Pay by card or in $TCODE. Credits land in this same wallet either way.</li>
            <li>Each API action deducts credits before the request runs.</li>
            <li>Insufficient balance returns HTTP 402.</li>
            <li>Open-source local CLIs do not spend cloud credits.</li>
            <li>$TCODE claims add usage credits to this same wallet once per UTC month.</li>
          </ul>
          <p style={{ marginBottom: 0, marginTop: 16 }}>
            <Link className="btn" href="/billing/usage">
              View usage
            </Link>
          </p>
        </Panel>
      </div>

      <Panel title="Transactions" noPad>
        {txns.length === 0 ? (
          <div className="empty">
            <strong>No transactions yet</strong>
            Top-ups and API charges will appear here.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Type</th>
                  <th>Product</th>
                  <th>Action</th>
                  <th>Delta</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {txns.map((t) => (
                  <tr key={t.id}>
                    <td>{formatTimestamp(t.createdAt)}</td>
                    <td>{t.type}</td>
                    <td>{t.product || '—'}</td>
                    <td className="mono">{t.action || '—'}</td>
                    <td style={{ color: t.creditsDelta >= 0 ? 'var(--ok)' : 'var(--bad)' }}>
                      {t.creditsDelta >= 0 ? '+' : ''}
                      {t.creditsDelta}
                    </td>
                    <td>{t.balanceAfter}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </PageScaffold>
  )
}
