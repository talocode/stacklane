import type { OrganizationRecord } from '../types';
export declare function listOrganizationsByUser(userId: string): Promise<OrganizationRecord[]>;
export declare function findOrganizationByIdOrSlugForUser(idOrSlug: string, userId: string): Promise<OrganizationRecord>;
export declare function createOrganization(input: {
    id: string;
    name: string;
    slug: string;
}): Promise<OrganizationRecord>;
export declare function addOrganizationMember(input: {
    id: string;
    organizationId: string;
    userId: string;
    role: 'owner' | 'admin' | 'member';
}): Promise<void>;
export declare function findUserRoleForOrganization(organizationId: string, userId: string): Promise<"owner" | "admin" | "member">;
