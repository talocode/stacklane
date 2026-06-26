import type { EnvironmentRecord, ProjectRecord } from '../types';
export declare function listProjectsByUser(userId: string): Promise<ProjectRecord[]>;
export declare function listProjectsByOrganizationForUser(organizationId: string, userId: string): Promise<ProjectRecord[]>;
export declare function findProjectByIdOrSlugForUser(idOrSlug: string, userId: string): Promise<ProjectRecord>;
export declare function findProjectById(projectId: string): Promise<ProjectRecord>;
export declare function createProject(input: {
    id: string;
    organizationId: string;
    name: string;
    slug: string;
    status: string;
    region: string;
    description: string;
}): Promise<ProjectRecord>;
export declare function updateProject(id: string, updates: {
    name?: string;
    status?: string;
    description?: string;
}): Promise<ProjectRecord>;
export declare function listProjectEnvironments(projectId: string): Promise<EnvironmentRecord[]>;
export declare function createProjectEnvironment(input: {
    id: string;
    projectId: string;
    name: string;
    slug: string;
    status: string;
    region: string;
    deploymentTarget: string;
}): Promise<EnvironmentRecord>;
export declare function updateEnvironment(environmentId: string, projectId: string, updates: {
    status?: string;
    region?: string;
    deploymentTarget?: string;
}): Promise<EnvironmentRecord>;
export declare function findUserRoleForProject(projectId: string, userId: string): Promise<"owner" | "admin" | "member">;
