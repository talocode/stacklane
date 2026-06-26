"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.stacklaneStoredAssetSchema = exports.stacklaneUsageEventSchema = exports.stacklaneApiKeySchema = exports.stacklaneApiCustomerSchema = void 0;
const zod_1 = require("zod");
exports.stacklaneApiCustomerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    email: zod_1.z.string().optional(),
    externalRef: zod_1.z.string().optional(),
    status: zod_1.z.enum(['active', 'suspended', 'deleted']),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.stacklaneApiKeySchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string(),
    name: zod_1.z.string(),
    keyHash: zod_1.z.string(),
    keyPrefix: zod_1.z.string(),
    status: zod_1.z.enum(['active', 'revoked']),
    scopes: zod_1.z.array(zod_1.z.string()),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    lastUsedAt: zod_1.z.string().optional()
});
exports.stacklaneUsageEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string().optional(),
    apiKeyId: zod_1.z.string().optional(),
    product: zod_1.z.string(),
    action: zod_1.z.string(),
    units: zod_1.z.number(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string()
});
exports.stacklaneStoredAssetSchema = zod_1.z.object({
    id: zod_1.z.string(),
    customerId: zod_1.z.string().optional(),
    product: zod_1.z.string(),
    filename: zod_1.z.string(),
    contentType: zod_1.z.string(),
    sizeBytes: zod_1.z.number(),
    storagePath: zod_1.z.string(),
    publicUrl: zod_1.z.string().optional(),
    checksum: zod_1.z.string().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
//# sourceMappingURL=stacklane.js.map