export interface DatabaseConnection {
    id: string;
    projectId: string;
    provider: 'stacklane_hosted' | 'postgres' | 'sqlite' | 'external';
    databaseUrl: string;
    passwordSecretRef: string;
    status: 'active' | 'inactive' | 'error';
    createdAt: string;
    updatedAt: string;
}
export interface CreateDatabaseConnectionInput {
    projectId: string;
    provider: DatabaseConnection['provider'];
    databaseUrl: string;
    password: string;
}
export declare function maskDatabaseUrl(url: string): string;
export declare function validateDatabaseUrl(url: string): {
    valid: boolean;
    error?: string;
};
