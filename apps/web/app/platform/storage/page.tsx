import { InfrastructurePage } from '@/components/infra-page'

export default function StoragePage() {
  return (
    <InfrastructurePage
      title="Storage"
      subtitle="Control-plane bucket policy and storage namespace posture."
      area="Object storage"
      queuedAction="Create bucket namespace"
      emptyState="No storage namespaces are configured for active projects."
      nextItems={[
        'Bucket listing by organization/project',
        'Signed URL policy controls',
        'Storage usage snapshot and retention states'
      ]}
    />
  )
}
