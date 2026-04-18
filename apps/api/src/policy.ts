import { HttpError } from './http'

export type Role = 'owner' | 'admin' | 'member'

export type PolicyAction =
  | 'organization:create'
  | 'project:create'
  | 'project:update'
  | 'environment:create'
  | 'environment:update'
  | 'apikey:create'
  | 'apikey:revoke'
  | 'provisioning:request'
  | 'provisioning:retry'

const allowAnyAuthenticated = new Set<PolicyAction>(['organization:create'])
const ownerAdminOnly = new Set<PolicyAction>([
  'project:create',
  'project:update',
  'environment:create',
  'environment:update',
  'apikey:create',
  'apikey:revoke',
  'provisioning:request',
  'provisioning:retry'
])

export function can(role: Role | null, action: PolicyAction) {
  if (allowAnyAuthenticated.has(action)) return true
  if (ownerAdminOnly.has(action)) return role === 'owner' || role === 'admin'
  return false
}

export function requirePermission(role: Role | null, action: PolicyAction) {
  if (!can(role, action)) {
    throw new HttpError(403, 'FORBIDDEN', 'You do not have permission for this action.', { action, role })
  }
}

export function projectCapabilities(role: Role | null) {
  const canMutate = role === 'owner' || role === 'admin'
  return {
    canManageProvisioning: canMutate,
    canManageApiKeys: canMutate,
    canManageEnvironments: canMutate,
    canUpdateProject: canMutate
  }
}
