'use client'

import { FormEvent, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MetaChip, PageScaffold, Panel, StatusBadge } from '@/components/app-shell'
import { apiClient, formatTimestamp } from '@/lib/api-client'
import type {
  ApiKey,
  AuditEvent,
  Environment,
  Project,
  ProvisioningAttempt,
  ProvisioningTask,
  ResourceStatus,
  Region
} from '@/lib/api-types'

export default function ProjectDetailPage() {
  const params = useParams<{ slug: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [events, setEvents] = useState<AuditEvent[]>([])
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [regions, setRegions] = useState<Region[]>([])
  const [task, setTask] = useState<ProvisioningTask | null>(null)
  const [attempts, setAttempts] = useState<ProvisioningAttempt[]>([])
  const [tasksHistory, setTasksHistory] = useState<ProvisioningTask[]>([])
  const [capabilities, setCapabilities] = useState<{ canManageProvisioning: boolean; canManageApiKeys: boolean; canManageEnvironments: boolean; canUpdateProject: boolean }>({
    canManageProvisioning: false,
    canManageApiKeys: false,
    canManageEnvironments: false,
    canUpdateProject: false
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const [newEnvironmentName, setNewEnvironmentName] = useState('')
  const [newApiKeyName, setNewApiKeyName] = useState('')
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [selectedRegion, setSelectedRegion] = useState('')

  async function loadProject(slug: string) {
    const [projectData, eventsData, keysData, envData, regionsData, provisioningData, taskList] = await Promise.all([
      apiClient.getProject(slug),
      apiClient.listProjectEvents(slug),
      apiClient.listProjectApiKeys(slug),
      apiClient.listEnvironments(slug),
      apiClient.listRegions(),
      apiClient.getProvisioning(slug),
      apiClient.listProvisioningTasks(slug)
    ])

    setProject(projectData)
    setEvents(eventsData)
    setKeys(keysData)
    setEnvironments(envData)
    setRegions(regionsData)
    setTask(provisioningData.task)
    setCapabilities(provisioningData.capabilities || projectData.capabilities || capabilities)
    setAttempts(provisioningData.attempts)
    setTasksHistory(taskList)
    if (!selectedRegion) {
      setSelectedRegion(projectData.region)
    }
  }

  useEffect(() => {
    if (!params.slug) return
    loadProject(params.slug)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false))
  }, [params.slug])

  async function updateStatus(status: ResourceStatus) {
    if (!project) return
    setUpdating(true)
    setError(null)
    try {
      await apiClient.updateProject(project.slug, { status })
      await loadProject(project.slug)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function triggerProvisioning() {
    if (!project) return
    setUpdating(true)
    setError(null)
    try {
      await apiClient.triggerProvisioning(project.slug, { regionCode: selectedRegion })
      await loadProject(project.slug)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function retryProvisioning() {
    if (!project) return
    setUpdating(true)
    setError(null)
    try {
      await apiClient.retryProvisioning(project.slug)
      await loadProject(project.slug)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function createEnvironment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!project || newEnvironmentName.trim().length < 2) return
    setUpdating(true)
    setError(null)
    try {
      await apiClient.createEnvironment(project.slug, { name: newEnvironmentName, region: selectedRegion })
      setNewEnvironmentName('')
      await loadProject(project.slug)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function activateEnvironment(environmentId: string) {
    if (!project) return
    setUpdating(true)
    try {
      await apiClient.updateEnvironment(project.slug, environmentId, { status: 'active' })
      await loadProject(project.slug)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function createApiKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!project || newApiKeyName.trim().length < 2) return
    setUpdating(true)
    setError(null)
    try {
      const created = await apiClient.createProjectApiKey(project.slug, { name: newApiKeyName })
      setNewSecret(created.secret)
      setNewApiKeyName('')
      await loadProject(project.slug)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  async function revokeKey(keyId: string) {
    if (!project) return
    setUpdating(true)
    setError(null)
    try {
      await apiClient.revokeProjectApiKey(project.slug, keyId)
      await loadProject(project.slug)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setUpdating(false)
    }
  }

  if (loading) {
    return <div className="page"><div className="table-state">Loading project details…</div></div>
  }

  if (error || !project) {
    return <div className="page"><div className="table-state">Unable to load project: {error || 'not found'}</div></div>
  }

  const statusTag = project.status === 'ready' ? 'healthy' : project.status === 'provisioning' ? 'warning' : 'paused'

  return (
    <PageScaffold
      title={project.name}
      subtitle="Control-plane project metadata, provisioning lifecycle, security keys, environments, and activity timeline."
      breadcrumbs={[{ label: 'Projects', href: '/projects' }, { label: project.slug }]}
      metadata={
        <>
          <MetaChip label="Project ID" value={project.id} />
          <MetaChip label="Region" value={project.region} />
          <MetaChip label="Status" value={project.status} />
        </>
      }
      actions={
        <>
          <button className="btn" onClick={() => updateStatus('paused')} disabled={updating}>Pause</button>
          <button className="btn primary" onClick={() => updateStatus('ready')} disabled={updating}>Set ready</button>
        </>
      }
    >
      <div className="section-grid">
        <Panel title="Provisioning lifecycle">
          <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <select value={selectedRegion} onChange={(event) => setSelectedRegion(event.target.value)}>
              {regions.map((region) => (
                <option key={region.id} value={region.code}>{region.code} · {region.name}</option>
              ))}
            </select>
            {capabilities.canManageProvisioning ? <button className="btn" onClick={triggerProvisioning} disabled={updating}>Provision</button> : null}
            {task?.status === 'failed' && capabilities.canManageProvisioning ? <button className="btn" onClick={retryProvisioning} disabled={updating}>Retry</button> : null}
          </div>

          {task ? (
            <div className="table-state">
              <strong>Current state: {task.status}</strong>
              <p>Region: {task.region?.code || 'n/a'} · Attempts: {task.currentAttempt}/{task.maxAttempts}</p>
              {task.lastError ? <p className="error">Last error: {task.lastError}</p> : null}
            </div>
          ) : (
            <div className="table-state"><strong>No provisioning task yet</strong><p>Trigger provisioning to initialize runtime bindings.</p></div>
          )}

          <table className="table">
            <thead><tr><th>Attempt</th><th>Status</th><th>Adapter</th><th>Error</th><th>Started</th></tr></thead>
            <tbody>
              {attempts.map((attempt) => (
                <tr key={attempt.id}>
                  <td>{attempt.attemptNo}</td>
                  <td>{attempt.status}</td>
                  <td>{attempt.adapter}</td>
                  <td>{attempt.errorMessage || '-'}</td>
                  <td className="timestamp">{attempt.startedAt ? formatTimestamp(attempt.startedAt) : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="Provisioning history">
          <table className="table">
            <thead><tr><th>Task</th><th>Status</th><th>Region</th><th>Updated</th></tr></thead>
            <tbody>
              {tasksHistory.map((item) => (
                <tr key={item.id}>
                  <td className="timestamp">{item.id}</td>
                  <td>{item.status}</td>
                  <td>{item.region?.code || '-'}</td>
                  <td className="timestamp">{formatTimestamp(item.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>

      <div className="section-grid">
        <Panel title="Environments">
          <form onSubmit={createEnvironment} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input
              value={newEnvironmentName}
              onChange={(event) => setNewEnvironmentName(event.target.value)}
              placeholder="Add environment e.g. staging"
            />
            <button className="btn" disabled={updating || newEnvironmentName.trim().length < 2 || !capabilities.canManageEnvironments}>Add</button>
          </form>
          <table className="table">
            <thead><tr><th>Name</th><th>Region</th><th>Status</th><th>Created</th><th /></tr></thead>
            <tbody>
              {environments.map((environment) => (
                <tr key={environment.id}>
                  <td><strong>{environment.name}</strong></td>
                  <td>{environment.region}</td>
                  <td><span className="status healthy">{environment.status}</span></td>
                  <td className="timestamp">{formatTimestamp(environment.createdAt)}</td>
                  <td><button className="btn ghost" onClick={() => activateEnvironment(environment.id)}>Set active</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>

        <Panel title="API keys">
          <form onSubmit={createApiKey} style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
            <input value={newApiKeyName} onChange={(event) => setNewApiKeyName(event.target.value)} placeholder="Key name" />
            <button className="btn" disabled={updating || newApiKeyName.trim().length < 2 || !capabilities.canManageApiKeys}>Create key</button>
          </form>
          {newSecret ? <div className="table-state"><strong>Copy secret now (shown once)</strong><p>{newSecret}</p></div> : null}
          <table className="table">
            <thead><tr><th>Name</th><th>Prefix</th><th>Status</th><th>Created</th><th /></tr></thead>
            <tbody>
              {keys.map((key) => (
                <tr key={key.id}>
                  <td><strong>{key.name}</strong></td>
                  <td>{key.prefix}</td>
                  <td><span className={`status ${key.status === 'active' ? 'healthy' : 'paused'}`}>{key.status}</span></td>
                  <td className="timestamp">{formatTimestamp(key.createdAt)}</td>
                  <td>
                    {key.status === 'active' ? <button className="btn ghost" onClick={() => revokeKey(key.id)}>Revoke</button> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      </div>


      <Panel title="Runtime binding summary">
        {task?.status === 'ready' ? (
          <div className="table-state">
            <strong>Provisioning ready</strong>
            <p>Runtime refs are available via provisioning snapshot API.</p>
          </div>
        ) : (
          <div className="table-state"><strong>No runtime binding ready</strong><p>Complete provisioning to generate binding references.</p></div>
        )}
      </Panel>

      <Panel title="Activity / audit">
        <table className="table">
          <thead><tr><th>Action</th><th>Actor</th><th>Target</th><th>Time</th></tr></thead>
          <tbody>
            {events.map((event) => (
              <tr key={event.id}>
                <td><strong>{event.action}</strong></td>
                <td>{event.actorUserId || 'system'}</td>
                <td>{event.targetType}</td>
                <td className="timestamp">{formatTimestamp(event.createdAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageScaffold>
  )
}
