import { z } from "zod";
export declare const projectStatusSchema: z.ZodEnum<["provisioning", "ready", "failed", "archived"]>;
export declare const createProjectInputSchema: z.ZodObject<{
    organizationId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
    createdByUserId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    organizationId: string;
    slug?: string | undefined;
    createdByUserId?: string | undefined;
}, {
    name: string;
    organizationId: string;
    slug?: string | undefined;
    createdByUserId?: string | undefined;
}>;
export declare const projectListQuerySchema: z.ZodObject<{
    organizationId: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    organizationId?: string | undefined;
}, {
    organizationId?: string | undefined;
}>;
export declare const environmentSchema: z.ZodObject<{
    id: z.ZodString;
    projectId: z.ZodString;
    name: z.ZodString;
    kind: z.ZodEnum<["production", "development", "preview"]>;
    status: z.ZodEnum<["active", "disabled"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    status: "active" | "disabled";
    createdAt: string;
    updatedAt: string;
    projectId: string;
    kind: "production" | "development" | "preview";
}, {
    id: string;
    name: string;
    status: "active" | "disabled";
    createdAt: string;
    updatedAt: string;
    projectId: string;
    kind: "production" | "development" | "preview";
}>;
export declare const projectSchema: z.ZodObject<{
    id: z.ZodString;
    organizationId: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    status: z.ZodEnum<["provisioning", "ready", "failed", "archived"]>;
    createdByUserId: z.ZodNullable<z.ZodString>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
    environments: z.ZodOptional<z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        projectId: z.ZodString;
        name: z.ZodString;
        kind: z.ZodEnum<["production", "development", "preview"]>;
        status: z.ZodEnum<["active", "disabled"]>;
        createdAt: z.ZodString;
        updatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        id: string;
        name: string;
        status: "active" | "disabled";
        createdAt: string;
        updatedAt: string;
        projectId: string;
        kind: "production" | "development" | "preview";
    }, {
        id: string;
        name: string;
        status: "active" | "disabled";
        createdAt: string;
        updatedAt: string;
        projectId: string;
        kind: "production" | "development" | "preview";
    }>, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    status: "provisioning" | "ready" | "failed" | "archived";
    createdAt: string;
    updatedAt: string;
    slug: string;
    organizationId: string;
    createdByUserId: string | null;
    environments?: {
        id: string;
        name: string;
        status: "active" | "disabled";
        createdAt: string;
        updatedAt: string;
        projectId: string;
        kind: "production" | "development" | "preview";
    }[] | undefined;
}, {
    id: string;
    name: string;
    status: "provisioning" | "ready" | "failed" | "archived";
    createdAt: string;
    updatedAt: string;
    slug: string;
    organizationId: string;
    createdByUserId: string | null;
    environments?: {
        id: string;
        name: string;
        status: "active" | "disabled";
        createdAt: string;
        updatedAt: string;
        projectId: string;
        kind: "production" | "development" | "preview";
    }[] | undefined;
}>;
export type CreateProjectInput = z.infer<typeof createProjectInputSchema>;
export type Project = z.infer<typeof projectSchema>;
export type ProjectListQuery = z.infer<typeof projectListQuerySchema>;
