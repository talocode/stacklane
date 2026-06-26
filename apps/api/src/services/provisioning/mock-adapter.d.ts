import type { ProvisioningAdapter, ProvisioningAdapterInput, ProvisioningAdapterResult } from './adapter';
export declare class MockProvisioningAdapter implements ProvisioningAdapter {
    name: string;
    provisionProject(input: ProvisioningAdapterInput): Promise<ProvisioningAdapterResult>;
}
