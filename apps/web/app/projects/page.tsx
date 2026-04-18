'use client'

import { useEffect, useState } from 'react'
import { MetaChip, PageScaffold, Panel } from '@/components/app-shell'
import { apiClient } from '@/lib/api-client'
import type { Project } from '@/lib/api-types'
import { ResourceTable, dateCell, statusCell } from '@/components/ui/resource-table'

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    apiClient
      .listProjects()
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <PageScaffold
      title="Projects"
      subtitle="Tenant project inventory with statuses and ownership links."
      breadcrumbs={[{ label: 'Projects' }]}
      metadata={
        <>
          <MetaChip label="Total" value={String(projects.length)} />
          <MetaChip label="Healthy" value={String(projects.filter((entry) => entry.status === 'ready').length)} />
        </>
      }
      actions={
        <>
          <a className="btn ghost" href="/organizations">Manage orgs</a>
          <a className="btn primary" href="/new-project">Create project</a>
        </>
      }
    >
      <Panel title="All projects">
        {error ? <div className="table-state">Failed to load projects: {error}</div> : null}
        <ResourceTable
          loading={loading}
          rows={projects}
          rowHref={(row) => `/projects/${row.slug}`}
          emptyTitle="No projects created"
          emptyDescription="Create your first project to initialize control-plane resources."
          columns={[
            { key: 'name', title: 'Name', render: (row) => <strong>{row.name}</strong> },
            { key: 'org', title: 'Organization', render: (row) => row.organization?.name || '-' },
            { key: 'status', title: 'Status', render: (row) => statusCell(row.status) },
            { key: 'created', title: 'Created', render: (row) => dateCell(row.createdAt) },
            { key: 'updated', title: 'Updated', render: (row) => dateCell(row.updatedAt) }
          ]}
        />
      </Panel>
    </PageScaffold>
  )
}
