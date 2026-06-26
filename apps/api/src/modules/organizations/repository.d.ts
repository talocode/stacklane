import type { StacklaneDb } from "../../db/client";
import type { CreateOrganizationInput } from "@stacklane/types";
export declare const createOrganization: (db: StacklaneDb, input: CreateOrganizationInput & {
    slug: string;
}) => Promise<{
    id: string;
    name: string;
    status: "active" | "suspended";
    createdAt: Date;
    updatedAt: Date;
    slug: string;
}>;
export declare const findOrganizationById: (db: StacklaneDb, id: string) => Promise<{
    id: string;
    name: string;
    slug: string;
    status: "active" | "suspended";
    createdAt: Date;
    updatedAt: Date;
}>;
