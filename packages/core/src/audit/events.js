"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAuditEvent = createAuditEvent;
function createAuditEvent(params) {
    return {
        projectId: params.projectId,
        action: params.action,
        actor: params.actor,
        metadata: params.metadata || {},
        createdAt: new Date().toISOString(),
    };
}
//# sourceMappingURL=events.js.map