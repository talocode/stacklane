import { InfrastructurePage } from '@/components/infra-page'

export default function JobsPage() {
  return (
    <InfrastructurePage
      title="Jobs"
      subtitle="Background worker and queue execution control-plane surface."
      area="Async processing"
      queuedAction="Create queue"
      emptyState="No worker queues are configured for projects yet."
      nextItems={[
        'Queue backlog and retry metrics',
        'Dead-letter queue inspection',
        'Worker health and processing throughput'
      ]}
    />
  )
}
