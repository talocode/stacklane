'use client'

import { useCallback, useEffect, useState } from 'react'
import { Panel } from '@/components/app-shell'
import { apiClient } from '@/lib/api-client'
import { encodeBase58 } from '@/lib/base58'
import { formatCredits } from '@/lib/format'
import type { TcodeHoldings } from '@/lib/api-types'

type SolanaProvider = {
  connect: () => Promise<{ publicKey?: { toBase58?: () => string } | string } | void>
  publicKey?: { toBase58?: () => string } | string
  signMessage: (
    message: Uint8Array,
    encoding?: string,
  ) => Promise<Uint8Array | { signature: Uint8Array }>
}

function getSolanaProvider(): SolanaProvider | null {
  if (typeof window === 'undefined') return null
  const injected = window as Window & {
    solana?: SolanaProvider
    phantom?: { solana?: SolanaProvider }
  }
  if (injected.solana && typeof injected.solana.connect === 'function') return injected.solana
  if (injected.phantom?.solana && typeof injected.phantom.solana.connect === 'function') {
    return injected.phantom.solana
  }
  return null
}

function publicKeyToAddress(value: { toBase58?: () => string } | string | undefined): string {
  if (!value) return ''
  if (typeof value === 'string') return value
  if (typeof value.toBase58 === 'function') return value.toBase58()
  return String(value)
}

function shortAddress(address: string) {
  if (address.length < 10) return address
  return `${address.slice(0, 4)}…${address.slice(-4)}`
}

// Tier ladder mirrors the server source of truth (stacklane-api-deploy
// netlify/functions/tcode.mjs TCODE_TIERS). Keep in sync if tiers change.
const TIER_LADDER = [
  { key: 'explorer', minTokens: 1, monthlyCredits: 1000 },
  { key: 'builder', minTokens: 100, monthlyCredits: 10000 },
  { key: 'ecosystem', minTokens: 1000, monthlyCredits: 100000 },
  { key: 'partner', minTokens: 5000, monthlyCredits: 500000 },
]

const JUPITER_BUY_URL = 'https://jup.ag/swap/SOL-6ptxwABxQz8zMhwhiPeVgRgWjGMdVcEBFBv8v8C3ory'

function periodLabel(period: string) {
  const [year, month] = period.split('-').map(Number)
  if (!year || !month) return period
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

export function TcodeHoldPanel({
  projectId,
  onClaimed,
}: {
  projectId: string
  onClaimed: () => void
}) {
  const [holdings, setHoldings] = useState<TcodeHoldings | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'linking' | 'claiming'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!projectId) {
      setHoldings(null)
      return
    }
    setStatus('loading')
    setError(null)
    try {
      const next = await apiClient.getTcodeHoldings(projectId)
      setHoldings(next)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not load holdings'
      if (/no linked wallet/i.test(message)) {
        setHoldings(null)
      } else {
        setError(message)
      }
    } finally {
      setStatus('idle')
    }
  }, [projectId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  async function linkWallet() {
    if (!projectId) return
    const provider = getSolanaProvider()
    if (!provider) {
      setError('Install a Solana browser wallet, then try again.')
      return
    }
    setStatus('linking')
    setError(null)
    setNotice(null)
    try {
      const connected = await provider.connect()
      const address = publicKeyToAddress(provider.publicKey) || publicKeyToAddress(connected?.publicKey)
      if (!address) throw new Error('Wallet did not return an address')
      const challenge = await apiClient.createTcodeChallenge(projectId)
      const signed = await provider.signMessage(new TextEncoder().encode(challenge.message), 'utf8')
      const signatureBytes = signed instanceof Uint8Array ? signed : signed.signature
      await apiClient.linkTcodeWallet({
        projectId,
        walletAddress: address,
        signature: encodeBase58(signatureBytes),
        nonce: challenge.nonce,
      })
      setNotice(`Linked ${shortAddress(address)}`)
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not link wallet')
      setStatus('idle')
    }
  }

  async function claim() {
    if (!projectId) return
    setStatus('claiming')
    setError(null)
    setNotice(null)
    try {
      const result = await apiClient.claimTcodeCredits(projectId)
      if (result.granted > 0) {
        setNotice(`Claimed ${formatCredits(result.granted)} for ${periodLabel(result.period)}.`)
        onClaimed()
      } else if (result.alreadyClaimed) {
        setNotice(`Already claimed ${periodLabel(result.period)}.`)
      } else {
        setNotice('Hold at least 1 $TCODE to claim this month.')
      }
      await refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not claim credits')
      setStatus('idle')
    }
  }

  const canClaim = Boolean(holdings?.tier) && !holdings?.claimedThisPeriod && status === 'idle'

  const currentTierIndex = holdings?.tier
    ? TIER_LADDER.findIndex((t) => t.key === holdings.tier?.key)
    : -1
  const nextTier = currentTierIndex >= 0 ? TIER_LADDER[currentTierIndex + 1] : TIER_LADDER[0]
  const tokensHeld = Math.floor(Number(holdings?.tcodeTokens) || 0)
  const tokensToNext = nextTier ? Math.max(nextTier.minTokens - tokensHeld, 0) : 0

  return (
    <Panel title="$TCODE hold-to-earn">
      <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
        Hold $TCODE in a Solana wallet you control, sign a one-time challenge to link it to this
        project, then claim this UTC month&apos;s API credits. Credits are usage credits, not cash.
      </p>

      {error ? <div className="alert error">{error}</div> : null}
      {notice ? <div className="alert success">{notice}</div> : null}

      {holdings ? (
        <div className="stack" style={{ gap: 10 }}>
          <div>
            <div className="label" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Linked wallet
            </div>
            <strong className="mono">{shortAddress(holdings.walletAddress)}</strong>
          </div>
          <div>
            <div className="label" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Holdings
            </div>
            <strong>{holdings.tcodeTokens.toLocaleString()} $TCODE</strong>
          </div>
          <div>
            <div className="label" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              Tier
            </div>
            <strong>
              {holdings.tier
                ? `${holdings.tier.key} · ${formatCredits(holdings.tier.monthlyCredits)} / month`
                : 'Below 1 $TCODE'}
            </strong>
          </div>
          <div>
            <div className="label" style={{ color: 'var(--text-muted)', fontSize: 12 }}>
              {periodLabel(holdings.period)}
            </div>
            <strong>{holdings.claimedThisPeriod ? 'Already claimed' : 'Not claimed yet'}</strong>
          </div>
        </div>
      ) : (
        <p style={{ color: 'var(--text-secondary)' }}>
          {status === 'loading' ? 'Checking linked wallet…' : 'No Solana wallet linked to this project yet.'}
        </p>
      )}

      <div style={{ marginTop: 18 }}>
        <div className="label" style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 8 }}>
          Hold-to-earn tiers
        </div>
        <div style={{ display: 'grid', gap: 8 }}>
          {TIER_LADDER.map((t, i) => {
            const isCurrent = i === currentTierIndex
            return (
              <div
                key={t.key}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  border: `1px solid ${isCurrent ? 'var(--accent, #38bdf8)' : 'var(--border, rgba(255,255,255,0.10))'}`,
                  borderRadius: 12,
                  padding: '10px 14px',
                  background: isCurrent ? 'rgba(56,189,248,0.08)' : 'transparent',
                }}
              >
                <span style={{ textTransform: 'capitalize', fontWeight: isCurrent ? 700 : 400 }}>
                  {t.key}
                  <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>
                    {' '}· {t.minTokens.toLocaleString()}+ $TCODE
                  </span>
                </span>
                <strong>{t.monthlyCredits.toLocaleString()} / mo</strong>
              </div>
            )
          })}
        </div>
        {nextTier && tokensToNext > 0 ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '10px 0 0' }}>
            Hold {tokensToNext.toLocaleString()} more $TCODE to reach {nextTier.key} ·{' '}
            <a href={JUPITER_BUY_URL} target="_blank" rel="noreferrer">
              Buy $TCODE
            </a>
          </p>
        ) : null}
        {!holdings?.tier ? (
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, margin: '10px 0 0' }}>
            No tier yet — hold at least 1 $TCODE, or{' '}
            <a href={JUPITER_BUY_URL} target="_blank" rel="noreferrer">
              buy $TCODE
            </a>
            .
          </p>
        ) : null}
      </div>

      <div className="actions" style={{ marginTop: 16 }}>
        <button
          className="btn"
          type="button"
          disabled={!projectId || status === 'linking' || status === 'claiming'}
          onClick={() => void linkWallet()}
        >
          {status === 'linking' ? 'Waiting for signature…' : holdings ? 'Relink wallet' : 'Connect Solana wallet'}
        </button>
        <button
          className="btn primary"
          type="button"
          disabled={!canClaim}
          onClick={() => void claim()}
        >
          {status === 'claiming'
            ? 'Claiming…'
            : holdings
              ? `Claim ${periodLabel(holdings.period)} credits`
              : 'Claim monthly credits'}
        </button>
      </div>
    </Panel>
  )
}
