'use client'

import { FormEvent, useEffect, useState } from 'react'
import Link from 'next/link'
import { PageScaffold, Panel, StatusBadge } from '@/components/app-shell'
import { apiClient } from '@/lib/api-client'
import { formatTimestamp } from '@/lib/format'
import type { ApiKey, Project } from '@/lib/api-types'

export default function ApiKeysPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [slug, setSlug] = useState('')
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [name, setName] = useState('production')
  const [secret, setSecret] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    apiClient
      .listProjects()
      .then((list) => {
        setProjects(list)
        if (list[0]) setSlug(list[0].slug)
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!slug) return
    setSecret(null)
    apiClient
      .listProjectApiKeys(slug)
      .then(setKeys)
      .catch((e) => setError((e as Error).message))
  }, [slug])

  async function ensureProject(): Promise<string> {
    if (slug) return slug

    // If projects exist in state, select the first one
    if (projects.length > 0 && projects[0]) {
      setSlug(projects[0].slug)
      return projects[0].slug
    }

    // Otherwise check/create organization
    const orgs = await apiClient.listOrganizations()
    let orgId = orgs[0]?.id
    if (!orgId) {
      const createdOrg = await apiClient.createOrganization({ name: 'Personal' })
      orgId = createdOrg.id
    }

    // Create default project
    const createdProject = await apiClient.createProject({
      name: 'Default',
      organizationId: orgId,
      status: 'ready',
      region: 'global',
      description: 'Default project for API keys',
    })

    const updatedProjects = await apiClient.listProjects()
    setProjects(updatedProjects)
    setSlug(createdProject.slug)
    return createdProject.slug
  }

  async function createKey(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSecret(null)
    try {
      const targetSlug = await ensureProject()
      const keyName = name.trim() || 'production'
      const result = await apiClient.createProjectApiKey(targetSlug, { name: keyName })
      setSecret(result.secret)
      setKeys(await apiClient.listProjectApiKeys(targetSlug))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function copySecret() {
    if (!secret) return
    try {
      await navigator.clipboard.writeText(secret)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Fallback
    }
  }

  async function revoke(keyId: string) {
    if (!slug) return
    if (!confirm('Revoke this API key?')) return
    setBusy(true)
    try {
      await apiClient.revokeProjectApiKey(slug, keyId)
      setKeys(await apiClient.listProjectApiKeys(slug))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <PageScaffold
      title="API keys"
      subtitle="Authenticate to api.talocode.site with Authorization: Bearer YOUR_KEY."
      breadcrumbs={[{ label: 'API keys' }]}
    >
      {error ? <div className="alert error">{error}</div> : null}

      <div className="grid-2">
        <Panel title="Create key">
          <form onSubmit={createKey}>
            <div className="field">
              <label htmlFor="project">Project</label>
              {projects.length > 0 ? (
                <select id="project" value={slug} onChange={(e) => setSlug(e.target.value)} required>
                  {projects.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id="project"
                  type="text"
                  readOnly
                  disabled
                  value="Default Project (auto-created)"
                  style={{ opacity: 0.8 }}
                />
              )}
            </div>
            <div className="field">
              <label htmlFor="name">Key Name</label>
              <input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="production"
                minLength={2}
                required
              />
            </div>
            <button className="btn primary" type="submit" disabled={busy || loading}>
              {busy ? 'Creating key…' : 'Create API key'}
            </button>
          </form>
          {secret ? (
            <div style={{ marginTop: 16 }}>
              <div className="alert success">Copy this secret now. It will not be shown again.</div>
              <div className="secret-box" style={{ marginTop: 10 }}>
                {secret}
              </div>
              <button
                className="btn"
                type="button"
                style={{ marginTop: 10 }}
                onClick={() => void copySecret()}
              >
                {copied ? '✓ Copied to clipboard' : 'Copy secret'}
              </button>
            </div>
          ) : null}
        </Panel>

        <Panel title="Usage">
          <p style={{ marginTop: 0, color: 'var(--text-secondary)' }}>
            Keys are project-scoped. Charges debit that project&apos;s wallet.
          </p>
          <pre className="secret-box" style={{ whiteSpace: 'pre-wrap' }}>{`export TALOCODE_API_KEY=tk_...
export TALOCODE_BASE_URL=https://api.talocode.site

curl "$TALOCODE_BASE_URL/v1/skills/health" \\
  -H "Authorization: Bearer $TALOCODE_API_KEY"`}</pre>
        </Panel>
      </div>

      <Panel title="Keys for selected project" noPad>
        {loading ? (
          <div className="empty">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="empty">
            <strong>No keys</strong>
            Create a key to call hosted APIs.
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Prefix</th>
                  <th>Status</th>
                  <th>Last used</th>
                  <th>Created</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k.id}>
                    <td>
                      <strong>{k.name}</strong>
                    </td>
                    <td className="mono">{k.prefix}…</td>
                    <td>
                      <StatusBadge value={k.status} />
                    </td>
                    <td>{formatTimestamp(k.lastUsedAt)}</td>
                    <td>{formatTimestamp(k.createdAt)}</td>
                    <td>
                      {k.status !== 'revoked' ? (
                        <button className="btn danger ghost" type="button" disabled={busy} onClick={() => void revoke(k.id)}>
                          Revoke
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
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
