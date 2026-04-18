import { InfrastructurePage } from '@/components/infra-page'

export default function AuthPage() {
  return (
    <InfrastructurePage
      title="Auth"
      subtitle="Control-plane auth configuration posture for projects."
      area="Identity"
      queuedAction="Initialize auth"
      emptyState="No project auth providers configured in this phase."
      nextItems={[
        'Email/password provider state',
        'Token/session policy controls',
        'Abuse and rate-limit policy surface'
      ]}
    />
  )
}
