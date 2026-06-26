import { z } from "zod";

const apiEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("127.0.0.1"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  WEB_ORIGIN: z.string().default("http://127.0.0.1:3000")
});

const dashboardEnvSchema = z.object({
  NEXT_PUBLIC_API_BASE_URL: z.string().url().default("http://127.0.0.1:4000"),
  NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID: z.string().uuid().optional()
});

export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type DashboardEnv = z.infer<typeof dashboardEnvSchema>;

export const loadApiEnv = (source: NodeJS.ProcessEnv = process.env): ApiEnv => {
  const merged = {
    ...source,
    HOST: source.HOST || source.API_HOST,
    PORT: source.PORT || source.API_PORT,
    WEB_ORIGIN: source.WEB_ORIGIN || source.CORS_ORIGIN
  };
  return apiEnvSchema.parse(merged);
};

export const loadDashboardEnv = (
  source: NodeJS.ProcessEnv = process.env
): DashboardEnv => {
  return dashboardEnvSchema.parse(source);
};
