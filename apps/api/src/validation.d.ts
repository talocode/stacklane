import { z } from 'zod';
export declare const projectStatuses: readonly ["provisioning", "ready", "paused", "error"];
export declare const loginSchema: z.ZodObject<{
    email: z.ZodString;
    password: z.ZodString;
}, "strip", z.ZodTypeAny, {
    email: string;
    password: string;
}, {
    email: string;
    password: string;
}>;
export declare const createOrganizationSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug?: string | undefined;
}, {
    name: string;
    slug?: string | undefined;
}>;
export declare const createProjectSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
    status: z.ZodDefault<z.ZodEnum<["provisioning", "ready", "paused", "error"]>>;
    region: z.ZodDefault<z.ZodString>;
    description: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: "provisioning" | "ready" | "error" | "paused";
    organizationId: string;
    region: string;
    description: string;
    slug?: string | undefined;
}, {
    name: string;
    organizationId: string;
    status?: "provisioning" | "ready" | "error" | "paused" | undefined;
    slug?: string | undefined;
    region?: string | undefined;
    description?: string | undefined;
}>;
export declare const updateProjectSchema: z.ZodEffects<z.ZodObject<{
    name: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodEnum<["provisioning", "ready", "paused", "error"]>>;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name?: string | undefined;
    status?: "provisioning" | "ready" | "error" | "paused" | undefined;
    description?: string | undefined;
}, {
    name?: string | undefined;
    status?: "provisioning" | "ready" | "error" | "paused" | undefined;
    description?: string | undefined;
}>, {
    name?: string | undefined;
    status?: "provisioning" | "ready" | "error" | "paused" | undefined;
    description?: string | undefined;
}, {
    name?: string | undefined;
    status?: "provisioning" | "ready" | "error" | "paused" | undefined;
    description?: string | undefined;
}>;
export declare const createEnvironmentSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    status: z.ZodDefault<z.ZodString>;
    region: z.ZodDefault<z.ZodString>;
    deploymentTarget: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    status: string;
    region: string;
    deploymentTarget: string;
    slug?: string | undefined;
}, {
    name: string;
    status?: string | undefined;
    slug?: string | undefined;
    region?: string | undefined;
    deploymentTarget?: string | undefined;
}>;
export declare const updateEnvironmentSchema: z.ZodEffects<z.ZodObject<{
    status: z.ZodOptional<z.ZodString>;
    region: z.ZodOptional<z.ZodString>;
    deploymentTarget: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status?: string | undefined;
    region?: string | undefined;
    deploymentTarget?: string | undefined;
}, {
    status?: string | undefined;
    region?: string | undefined;
    deploymentTarget?: string | undefined;
}>, {
    status?: string | undefined;
    region?: string | undefined;
    deploymentTarget?: string | undefined;
}, {
    status?: string | undefined;
    region?: string | undefined;
    deploymentTarget?: string | undefined;
}>;
export declare const createApiKeySchema: z.ZodObject<{
    name: z.ZodString;
}, "strip", z.ZodTypeAny, {
    name: string;
}, {
    name: string;
}>;
export declare const provisionProjectSchema: z.ZodObject<{
    regionCode: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    regionCode?: string | undefined;
}, {
    regionCode?: string | undefined;
}>;
