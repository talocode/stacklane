export type Role = 'owner' | 'admin' | 'member';
export type PolicyAction = 'organization:create' | 'project:create' | 'project:update' | 'environment:create' | 'environment:update' | 'apikey:create' | 'apikey:revoke' | 'provisioning:request' | 'provisioning:retry';
export declare function can(role: Role | null, action: PolicyAction): boolean;
export declare function requirePermission(role: Role | null, action: PolicyAction): void;
export declare function projectCapabilities(role: Role | null): {
    canManageProvisioning: boolean;
    canManageApiKeys: boolean;
    canManageEnvironments: boolean;
    canUpdateProject: boolean;
};
