"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadDashboardEnv = exports.loadApiEnv = void 0;
const zod_1 = require("zod");
const apiEnvSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(["development", "test", "production"]).default("development"),
    HOST: zod_1.z.string().default("127.0.0.1"),
    PORT: zod_1.z.coerce.number().int().positive().default(4000),
    DATABASE_URL: zod_1.z.string().url(),
    WEB_ORIGIN: zod_1.z.string().default("http://127.0.0.1:3000")
});
const dashboardEnvSchema = zod_1.z.object({
    NEXT_PUBLIC_API_BASE_URL: zod_1.z.string().url().default("http://127.0.0.1:4000"),
    NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID: zod_1.z.string().uuid().optional()
});
const loadApiEnv = (source = process.env) => {
    const merged = {
        ...source,
        HOST: source.HOST || source.API_HOST,
        PORT: source.PORT || source.API_PORT,
        WEB_ORIGIN: source.WEB_ORIGIN || source.CORS_ORIGIN
    };
    return apiEnvSchema.parse(merged);
};
exports.loadApiEnv = loadApiEnv;
const loadDashboardEnv = (source = process.env) => {
    return dashboardEnvSchema.parse(source);
};
exports.loadDashboardEnv = loadDashboardEnv;
//# sourceMappingURL=index.js.map