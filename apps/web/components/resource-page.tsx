import { PageScaffold, Panel, StatusBadge } from './app-shell'

export function ResourcePage({
  title,
  subtitle,
  rows
}: {
  title: string
  subtitle: string
  rows: Array<{ name: string; type: string; region: string; status: 'healthy' | 'warning' | 'paused' }>
}) {
  return (
    <PageScaffold
      title={title}
      subtitle={subtitle}
      actions={
        <>
          <button className="btn">Refresh</button>
          <button className="btn primary">Create</button>
        </>
      }
    >
      <Panel title="Resource inventory">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Region</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name}>
                <td><strong>{row.name}</strong></td>
                <td>{row.type}</td>
                <td>{row.region}</td>
                <td><StatusBadge value={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </PageScaffold>
  )
}
