export type ProvisioningAdapterInput = {
    projectId: string;
    projectSlug: string;
    regionCode: string;
};
export type ProvisioningAdapterResult = {
    databaseRef: string;
    storageRef: string;
    authNamespaceRef: string;
    functionsNamespaceRef: string;
    diagnostics: Record<string, unknown>;
};
export interface ProvisioningAdapter {
    name: string;
    provisionProject(input: ProvisioningAdapterInput): Promise<ProvisioningAdapterResult>;
}
