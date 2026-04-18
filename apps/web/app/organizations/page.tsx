'use client'

import { FormEvent, useEffect, useState } from 'react'
import { MetaChip, PageScaffold, Panel } from '@/components/app-shell'
import { apiClient } from '@/lib/api-client'
import type { Organization } from '@/lib/api-types'
import { ResourceTable, dateCell } from '@/components/ui/resource-table'

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  async function loadOrganizations() {
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.listOrganizations()
      setOrganizations(data)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganizations()
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setCreateError(null)

    if (name.trim().length < 2) {
      setCreateError('Organization name must be at least 2 characters.')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.createOrganization({ name, slug })
      setName('')
      setSlug('')
      await loadOrganizations()
    } catch (err) {
      setCreateError((err as Error).message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <PageScaffold
      title="Organizations"
      subtitle="Tenant organization boundaries for project ownership and member access."
      breadcrumbs={[{ label: 'Organizations' }]}
      metadata={<MetaChip label="Count" value={String(organizations.length)} />}
    >
      <div className="section-grid">
        <Panel title="All organizations" actions={<button className="btn" onClick={loadOrganizations}>Refresh</button>}>
          {error ? <div className="table-state">Failed to load organizations: {error}</div> : null}
          <ResourceTable
            loading={loading}
            rows={organizations}
            emptyTitle="No organizations created"
            emptyDescription="Create an organization to assign project tenancy and owners."
            columns={[
              { key: 'name', title: 'Name', render: (row) => <strong>{row.name}</strong> },
              { key: 'slug', title: 'Slug', render: (row) => row.slug },
              { key: 'status', title: 'Status', render: () => <span className="status healthy">active</span> },
              { key: 'created', title: 'Created', render: (row) => dateCell(row.createdAt) },
              { key: 'updated', title: 'Updated', render: (row) => dateCell(row.updatedAt) },
              { key: 'ops', title: 'Operations', render: (row) => <a className="timestamp" href={`/organizations/${row.slug}/operations`}>View</a> }
            ]}
          />
        </Panel>

        <Panel title="Create organization">
          <form onSubmit={onSubmit} className="page-content">
            <div className="field">
              <label>Organization name</label>
              <input value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Payflow Labs" />
            </div>
            <div className="field">
              <label>Slug (optional)</label>
              <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="e.g. payflow-labs" />
            </div>
            {createError ? <p className="error">{createError}</p> : null}
            <button className="btn primary" disabled={submitting}>
              {submitting ? 'Creating…' : 'Create organization'}
            </button>
          </form>
        </Panel>
      </div>
    </PageScaffold>
  )
}
