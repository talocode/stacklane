'use client'

import { FormEvent, useState } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'

export default function SignInPage() {
  const [email, setEmail] = useState('admin@stacklane.local')
  const [password, setPassword] = useState('stacklane-admin')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      await apiClient.login({ email, password })
      router.push('/')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="signin-page">
      <section className="signin-card">
        <h1>Stacklane Control Plane</h1>
        <p>Sign in with an operator account to access organizations and projects.</p>
        <form onSubmit={onSubmit} className="page-content">
          <div className="field">
            <label>Email</label>
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </div>
          <div className="field">
            <label>Password</label>
            <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          </div>
          {error ? <p className="error">{error}</p> : null}
          <button className="btn primary" disabled={loading}>{loading ? 'Signing in…' : 'Sign in'}</button>
        </form>
      </section>
    </main>
  )
}
