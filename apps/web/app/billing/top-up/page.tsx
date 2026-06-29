'use client'

import { useSearchParams, useRouter } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { PageScaffold, Panel } from '@/components/app-shell'
import { CreditCard, CheckCircle, XCircle, Loader } from 'lucide-react'

function TopUpContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const clientSecret = searchParams.get('clientSecret')
  const publishableKey = searchParams.get('publishableKey')
  const [status, setStatus] = useState<'loading' | 'ready' | 'completed' | 'error'>('loading')

  useEffect(() => {
    if (!clientSecret || !publishableKey) {
      setStatus('error')
      return
    }

    // Dynamically load Stripe.js
    const script = document.createElement('script')
    script.src = 'https://js.stripe.com/v3/'
    script.async = true
    script.onload = () => {
      try {
        const stripe = (window as unknown as Record<string, unknown>).Stripe as (key: string) => {
          initEmbeddedCheckout: (opts: { clientSecret: string }) => Promise<{
            mount: (el: string) => void
          }>
        }
        const instance = stripe(publishableKey)
        instance.initEmbeddedCheckout({ clientSecret }).then((checkout) => {
          checkout.mount('#stripe-checkout')
          setStatus('ready')
        })
      } catch {
        setStatus('error')
      }
    }
    script.onerror = () => setStatus('error')
    document.head.appendChild(script)

    return () => {
      const existing = document.querySelector('script[src="https://js.stripe.com/v3/"]')
      if (existing) existing.remove()
    }
  }, [clientSecret, publishableKey])

  if (!clientSecret || !publishableKey) {
    return (
      <PageScaffold title="Top Up" subtitle="Stripe checkout" breadcrumbs={[{ label: 'Billing', href: '/billing' }, { label: 'Top Up' }]}>
        <Panel title="Error">
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <XCircle size={48} style={{ color: '#ef6b6b', marginBottom: 12 }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Missing checkout parameters</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>
              No client secret or publishable key provided. Please initiate a top-up from the billing page.
            </p>
            <a className="btn primary" href="/billing">Back to billing</a>
          </div>
        </Panel>
      </PageScaffold>
    )
  }

  return (
    <PageScaffold
      title="Top Up Credits"
      subtitle="Secure payment via Stripe Embedded Checkout"
      breadcrumbs={[{ label: 'Billing', href: '/billing' }, { label: 'Top Up' }]}
    >
      <Panel title="Payment">
        {status === 'loading' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <Loader size={32} style={{ color: 'var(--accent)', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
            <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Loading secure checkout...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        )}

        {status === 'ready' && (
          <div style={{ minHeight: 400 }}>
            <div id="stripe-checkout" />
            <div style={{ marginTop: 16, fontSize: 11, color: 'var(--text-muted)', textAlign: 'center' }}>
              <CreditCard size={12} style={{ marginRight: 4, display: 'inline' }} />
              Powered by Stripe. Your payment info is secure.
            </div>
          </div>
        )}

        {status === 'completed' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <CheckCircle size={48} style={{ color: '#33c38f', marginBottom: 12 }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Payment Successful!</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>
              Your credits have been added to your wallet.
            </p>
            <a className="btn primary" href="/billing">Back to wallet</a>
          </div>
        )}

        {status === 'error' && (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <XCircle size={48} style={{ color: '#ef6b6b', marginBottom: 12 }} />
            <h2 style={{ margin: '0 0 8px', fontSize: 16 }}>Something went wrong</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: 12, margin: '0 0 16px' }}>
              Could not load the payment form. Please try again.
            </p>
            <a className="btn primary" href="/billing">Back to billing</a>
          </div>
        )}
      </Panel>
    </PageScaffold>
  )
}

export default function TopUpPage() {
  return (
    <Suspense fallback={
      <PageScaffold title="Top Up" subtitle="Loading..." breadcrumbs={[{ label: 'Billing', href: '/billing' }, { label: 'Top Up' }]}>
        <div className="table-state"><strong>Loading...</strong></div>
      </PageScaffold>
    }>
      <TopUpContent />
    </Suspense>
  )
}
