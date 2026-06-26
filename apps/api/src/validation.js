"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.provisionProjectSchema = exports.createApiKeySchema = exports.updateEnvironmentSchema = exports.createEnvironmentSchema = exports.updateProjectSchema = exports.createProjectSchema = exports.createOrganizationSchema = exports.loginSchema = exports.projectStatuses = void 0;
const zod_1 = require("zod");
exports.projectStatuses = ['provisioning', 'ready', 'paused', 'error'];
exports.loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8)
});
exports.createOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2),
    slug: zod_1.z.string().trim().min(2).optional()
});
exports.createProjectSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2),
    slug: zod_1.z.string().trim().min(2).optional(),
    organizationId: zod_1.z.string().trim().min(1),
    status: zod_1.z.enum(exports.projectStatuses).default('provisioning'),
    region: zod_1.z.string().trim().min(2).default('af-west-1'),
    description: zod_1.z.string().default('')
});
exports.updateProjectSchema = zod_1.z
    .object({
    name: zod_1.z.string().trim().min(2).optional(),
    status: zod_1.z.enum(exports.projectStatuses).optional(),
    description: zod_1.z.string().optional()
})
    .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.'
});
exports.createEnvironmentSchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2),
    slug: zod_1.z.string().trim().min(2).optional(),
    status: zod_1.z.string().trim().default('active'),
    region: zod_1.z.string().trim().default('af-west-1'),
    deploymentTarget: zod_1.z.string().trim().default('primary')
});
exports.updateEnvironmentSchema = zod_1.z
    .object({
    status: zod_1.z.string().trim().optional(),
    region: zod_1.z.string().trim().optional(),
    deploymentTarget: zod_1.z.string().trim().optional()
})
    .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field must be provided.'
});
exports.createApiKeySchema = zod_1.z.object({
    name: zod_1.z.string().trim().min(2)
});
exports.provisionProjectSchema = zod_1.z.object({
    regionCode: zod_1.z.string().trim().min(2).optional()
});
//# sourceMappingURL=validation.js.map