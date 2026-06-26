import { z } from "zod";
declare const apiEnvSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<["development", "test", "production"]>>;
    HOST: z.ZodDefault<z.ZodString>;
    PORT: z.ZodDefault<z.ZodNumber>;
    DATABASE_URL: z.ZodString;
    WEB_ORIGIN: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    PORT: number;
    DATABASE_URL: string;
    WEB_ORIGIN: string;
    NODE_ENV: "production" | "development" | "test";
    HOST: string;
}, {
    DATABASE_URL: string;
    PORT?: number | undefined;
    WEB_ORIGIN?: string | undefined;
    NODE_ENV?: "production" | "development" | "test" | undefined;
    HOST?: string | undefined;
}>;
declare const dashboardEnvSchema: z.ZodObject<{
    NEXT_PUBLIC_API_BASE_URL: z.ZodDefault<z.ZodString>;
    NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    NEXT_PUBLIC_API_BASE_URL: string;
    NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID?: string | undefined;
}, {
    NEXT_PUBLIC_API_BASE_URL?: string | undefined;
    NEXT_PUBLIC_DEFAULT_ORGANIZATION_ID?: string | undefined;
}>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type DashboardEnv = z.infer<typeof dashboardEnvSchema>;
export declare const loadApiEnv: (source?: NodeJS.ProcessEnv) => ApiEnv;
export declare const loadDashboardEnv: (source?: NodeJS.ProcessEnv) => DashboardEnv;
export {};
