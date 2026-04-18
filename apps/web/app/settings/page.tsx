import { PageScaffold, Panel } from '@/components/app-shell'

export default function SettingsPage() {
  return (
    <PageScaffold title="Settings" subtitle="Configure platform defaults and operational behavior.">
      <Panel title="General settings">
        <form className="form-grid">
          <div className="field"><label>Default region</label><select><option>af-west-1</option></select></div>
          <div className="field"><label>Alert email</label><input defaultValue="ops@stacklane.dev" /></div>
          <div className="field"><label>Log retention (days)</label><input defaultValue="30" /></div>
          <div className="field"><label>Usage export cadence</label><select><option>Daily</option></select></div>
        </form>
      </Panel>
    </PageScaffold>
  )
}
