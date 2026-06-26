"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectSchema = exports.environmentSchema = exports.projectListQuerySchema = exports.createProjectInputSchema = exports.projectStatusSchema = void 0;
const zod_1 = require("zod");
exports.projectStatusSchema = zod_1.z.enum([
    "provisioning",
    "ready",
    "failed",
    "archived"
]);
exports.createProjectInputSchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(2).max(120),
    slug: zod_1.z
        .string()
        .min(2)
        .max(80)
        .regex(/^[a-z0-9-]+$/)
        .optional(),
    createdByUserId: zod_1.z.string().uuid().optional()
});
exports.projectListQuerySchema = zod_1.z.object({
    organizationId: zod_1.z.string().uuid().optional()
});
exports.environmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    projectId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    kind: zod_1.z.enum(["production", "development", "preview"]),
    status: zod_1.z.enum(["active", "disabled"]),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
exports.projectSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    organizationId: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    status: exports.projectStatusSchema,
    createdByUserId: zod_1.z.string().uuid().nullable(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
    environments: zod_1.z.array(exports.environmentSchema).optional()
});
//# sourceMappingURL=projects.js.map