"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.can = can;
exports.requirePermission = requirePermission;
exports.projectCapabilities = projectCapabilities;
const http_1 = require("./http");
const allowAnyAuthenticated = new Set(['organization:create']);
const ownerAdminOnly = new Set([
    'project:create',
    'project:update',
    'environment:create',
    'environment:update',
    'apikey:create',
    'apikey:revoke',
    'provisioning:request',
    'provisioning:retry'
]);
function can(role, action) {
    if (allowAnyAuthenticated.has(action))
        return true;
    if (ownerAdminOnly.has(action))
        return role === 'owner' || role === 'admin';
    return false;
}
function requirePermission(role, action) {
    if (!can(role, action)) {
        throw new http_1.HttpError(403, 'FORBIDDEN', 'You do not have permission for this action.', { action, role });
    }
}
function projectCapabilities(role) {
    const canMutate = role === 'owner' || role === 'admin';
    return {
        canManageProvisioning: canMutate,
        canManageApiKeys: canMutate,
        canManageEnvironments: canMutate,
        canUpdateProject: canMutate
    };
}
//# sourceMappingURL=policy.js.map