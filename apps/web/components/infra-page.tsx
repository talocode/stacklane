import { MetaChip, PageScaffold, Panel } from '@/components/app-shell'

type InfraPageProps = {
  title: string
  subtitle: string
  area: string
  queuedAction: string
  emptyState: string
  nextItems: string[]
}

export function InfrastructurePage({ title, subtitle, area, queuedAction, emptyState, nextItems }: InfraPageProps) {
  return (
    <PageScaffold
      title={title}
      subtitle={subtitle}
      breadcrumbs={[{ label: 'Infrastructure' }, { label: title }]}
      metadata={
        <>
          <MetaChip label="Area" value={area} />
          <MetaChip label="State" value="Not configured" />
        </>
      }
      actions={
        <>
          <button className="btn">Open docs</button>
          <button className="btn primary">{queuedAction}</button>
        </>
      }
    >
      <div className="section-grid">
        <Panel title="Current status">
          <div className="table-state">
            <strong>{emptyState}</strong>
            <p>This section is structured for MVP control-plane workflows but backend runtime is deferred.</p>
          </div>
        </Panel>
        <Panel title="Planned IA">
          <ul className="placeholder-list">
            {nextItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Resource table shell">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status</th>
              <th>Updated</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>No resources configured</strong></td>
              <td><span className="status warning">pending</span></td>
              <td className="timestamp">Awaiting capability rollout</td>
              <td><button className="btn ghost">Inspect</button></td>
            </tr>
          </tbody>
        </table>
      </Panel>
    </PageScaffold>
  )
}
