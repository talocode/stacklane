'use client'

import { useEffect, useState } from 'react'
import { MetaChip, PageScaffold, Panel, StatusBadge } from '@/components/app-shell'
import { apiClient } from '@/lib/api-client'
import type { Organization, Project } from '@/lib/api-types'

export default function OverviewPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [organizations, setOrganizations] = useState<Organization[]>([])

  useEffect(() => {
    apiClient.listProjects().then(setProjects).catch(() => null)
    apiClient.listOrganizations().then(setOrganizations).catch(() => null)
  }, [])

  return (
    <PageScaffold
      title="Overview"
      subtitle="Control-plane operational summary for organizations and projects."
      breadcrumbs={[{ label: 'Overview' }]}
      metadata={
        <>
          <MetaChip label="Organizations" value={String(organizations.length)} />
          <MetaChip label="Projects" value={String(projects.length)} />
        </>
      }
      actions={
        <>
          <a className="btn" href="/organizations">View organizations</a>
          <a className="btn primary" href="/new-project">Create project</a>
        </>
      }
    >
      <div className="kv">
        <div className="cell"><p className="label">Ready projects</p><p className="value">{projects.filter((item) => item.status === 'ready').length}</p></div>
        <div className="cell"><p className="label">Provisioning</p><p className="value">{projects.filter((item) => item.status === 'provisioning').length}</p></div>
        <div className="cell"><p className="label">Paused/Error</p><p className="value">{projects.filter((item) => item.status === 'paused' || item.status === 'error').length}</p></div>
        <div className="cell"><p className="label">Primary region</p><p className="value">af-west-1</p></div>
      </div>
      <Panel title="Recent projects">
        <table className="table">
          <thead><tr><th>Project</th><th>Org</th><th>Status</th><th>Region</th></tr></thead>
          <tbody>
            {projects.slice(0, 5).map((project) => {
              const state = project.status === 'ready' ? 'healthy' : project.status === 'provisioning' ? 'warning' : 'paused'
              return (
                <tr key={project.id}>
                  <td><strong><a href={`/projects/${project.slug}`}>{project.name}</a></strong></td>
                  <td>{project.organization?.name || '-'}</td>
                  <td><StatusBadge value={state} /></td>
                  <td>{project.region}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Panel>
    </PageScaffold>
  )
}
