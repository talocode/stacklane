'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MetaChip, PageScaffold, Panel } from '@/components/app-shell'
import { apiClient, formatTimestamp } from '@/lib/api-client'
import type { OrganizationOperationsRow } from '@/lib/api-types'

export default function OrganizationOperationsPage() {
  const params = useParams<{ slug: string }>()
  const [rows, setRows] = useState<OrganizationOperationsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  useEffect(() => {
    if (!params.slug) return
    apiClient
      .listOrganizationOperations(params.slug)
      .then(setRows)
      .finally(() => setLoading(false))
  }, [params.slug])

  const visible = rows.filter((row) => (statusFilter === 'all' ? true : row.provisioning?.status === statusFilter))

  return (
    <PageScaffold
      title="Organization operations"
      subtitle="Cross-project provisioning visibility and operational state."
      breadcrumbs={[{ label: 'Organizations', href: '/organizations' }, { label: params.slug || '' }, { label: 'Operations' }]}
      metadata={<MetaChip label="Projects" value={String(rows.length)} />}
      actions={
        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="all">All states</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="retrying">Retrying</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
        </select>
      }
    >
      <Panel title="Provisioning fleet status">
        {loading ? <div className="table-state">Loading operations…</div> : null}
        <table className="table">
          <thead><tr><th>Project</th><th>Status</th><th>Region</th><th>Last error</th><th>Updated</th></tr></thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.project.id}>
                <td><strong><a href={`/projects/${row.project.slug}`}>{row.project.name}</a></strong></td>
                <td>{row.provisioning?.status || 'not started'}</td>
                <td>{row.provisioning?.region?.code || row.project.region}</td>
                <td>{row.provisioning?.lastError || '-'}</td>
                <td className="timestamp">{row.provisioning ? formatTimestamp(row.provisioning.updatedAt) : formatTimestamp(row.project.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageScaffold>
  )
}
