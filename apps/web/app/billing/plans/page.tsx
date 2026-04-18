import { ResourcePage } from '@/components/resource-page'

export default function Page() {
  return <ResourcePage title="Plans" subtitle="Plan catalog, limits, and enforcement controls." rows=[
    { name: 'primary', type: 'Core', region: 'af-west-1', status: 'healthy' },
    { name: 'worker-1', type: 'Worker', region: 'af-west-1', status: 'healthy' },
    { name: 'canary', type: 'Canary', region: 'af-west-1', status: 'warning' }
  ] />
}
