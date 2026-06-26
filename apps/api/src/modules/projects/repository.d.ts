import type { StacklaneDb } from "../../db/client";
import type { CreateProjectInput } from "@stacklane/types";
export declare const createProject: (db: StacklaneDb, input: CreateProjectInput & {
    slug: string;
}) => Promise<{
    id: string;
    name: string;
    status: "provisioning" | "ready" | "failed" | "archived";
    createdAt: Date;
    updatedAt: Date;
    slug: string;
    organizationId: string;
    createdByUserId: string | null;
}>;
export declare const findProjectById: (db: StacklaneDb, id: string) => Promise<{
    environments: {
        id: string;
        projectId: string;
        name: string;
        kind: "production" | "development" | "preview";
        status: "active" | "disabled";
        createdAt: Date;
        updatedAt: Date;
    }[];
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    status: "provisioning" | "ready" | "failed" | "archived";
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
} | null>;
export declare const listProjects: (db: StacklaneDb, organizationId?: string) => Promise<{
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    status: "provisioning" | "ready" | "failed" | "archived";
    createdByUserId: string | null;
    createdAt: Date;
    updatedAt: Date;
}[]>;
