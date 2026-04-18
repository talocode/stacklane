'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { MetaChip, PageScaffold, Panel } from '@/components/app-shell'
import { apiClient } from '@/lib/api-client'
import type { Organization, ResourceStatus } from '@/lib/api-types'

const statuses: ResourceStatus[] = ['provisioning', 'ready', 'paused', 'error']

export default function CreateProjectPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const [name, setName] = useState('')
  const [organizationId, setOrganizationId] = useState('')
  const [status, setStatus] = useState<ResourceStatus>('provisioning')
  const [region, setRegion] = useState('af-west-1')
  const [description, setDescription] = useState('')

  useEffect(() => {
    apiClient
      .listOrganizations()
      .then((data) => {
        setOrganizations(data)
        setOrganizationId(data[0]?.id || '')
      })
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const validationError = useMemo(() => {
    if (name.trim().length < 2) return 'Project name must be at least 2 characters.'
    if (!organizationId) return 'Select an organization before creating a project.'
    return null
  }, [name, organizationId])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (validationError) {
      setError(validationError)
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const created = await apiClient.createProject({
        name,
        organizationId,
        status,
        region,
        description
      })
      router.push(`/projects/${created.slug}`)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageScaffold
      title="Create project"
      subtitle="Create a control-plane project and set initial operational metadata."
      breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: 'Create project' }]}
      metadata={<MetaChip label="Organizations" value={String(organizations.length)} />}
    >
      <Panel title="Project registration">
        <form className="form-grid" onSubmit={onSubmit}>
          <div className="field">
            <label>Project name</label>
            <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. payments-core" />
          </div>
          <div className="field">
            <label>Organization</label>
            <select
              disabled={loading || !organizations.length}
              value={organizationId}
              onChange={(event) => setOrganizationId(event.target.value)}
            >
              {organizations.map((org) => (
                <option key={org.id} value={org.id}>
                  {org.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={status} onChange={(event) => setStatus(event.target.value as ResourceStatus)}>
              {statuses.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Region</label>
            <input value={region} onChange={(event) => setRegion(event.target.value)} />
          </div>
          <div className="field" style={{ gridColumn: '1 / -1' }}>
            <label>Description</label>
            <textarea value={description} onChange={(event) => setDescription(event.target.value)} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
            <button className="btn" type="button" onClick={() => router.push('/projects')}>Cancel</button>
            <button className="btn primary" disabled={submitting || !!validationError}>
              {submitting ? 'Creating…' : 'Create project'}
            </button>
          </div>
          {error ? <p className="error" style={{ gridColumn: '1 / -1' }}>{error}</p> : null}
        </form>
      </Panel>
    </PageScaffold>
  )
}
