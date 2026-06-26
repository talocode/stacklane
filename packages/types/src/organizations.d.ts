import { z } from "zod";
export declare const organizationStatusSchema: z.ZodEnum<["active", "suspended"]>;
export declare const createOrganizationInputSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    slug?: string | undefined;
}, {
    name: string;
    slug?: string | undefined;
}>;
export declare const organizationSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    slug: z.ZodString;
    status: z.ZodEnum<["active", "suspended"]>;
    createdAt: z.ZodString;
    updatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    status: "active" | "suspended";
    createdAt: string;
    updatedAt: string;
    slug: string;
}, {
    id: string;
    name: string;
    status: "active" | "suspended";
    createdAt: string;
    updatedAt: string;
    slug: string;
}>;
export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;
export type Organization = z.infer<typeof organizationSchema>;
