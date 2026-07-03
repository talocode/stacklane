import { ResourcePage } from '@/components/resource-page'

export default function Page() {
  return <ResourcePage title="API Keys" subtitle="Issue and rotate scoped project API credentials." rows={[
    { name: 'primary', type: 'Core', region: 'af-west-1', status: 'healthy' },
    { name: 'worker-1', type: 'Worker', region: 'af-west-1', status: 'healthy' },
    { name: 'canary', type: 'Canary', region: 'af-west-1', status: 'warning' }
  ]} />
}
