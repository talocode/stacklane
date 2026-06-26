"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.organizationSchema = exports.createOrganizationInputSchema = exports.organizationStatusSchema = void 0;
const zod_1 = require("zod");
exports.organizationStatusSchema = zod_1.z.enum(["active", "suspended"]);
exports.createOrganizationInputSchema = zod_1.z.object({
    name: zod_1.z.string().min(2).max(120),
    slug: zod_1.z
        .string()
        .min(2)
        .max(80)
        .regex(/^[a-z0-9-]+$/)
        .optional()
});
exports.organizationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    slug: zod_1.z.string(),
    status: exports.organizationStatusSchema,
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string()
});
//# sourceMappingURL=organizations.js.map