import type { RegionRecord } from '../types';
export declare function listRegions(): Promise<RegionRecord[]>;
export declare function findRegionByCode(code: string): Promise<RegionRecord>;
export declare function findRegionById(id: string): Promise<RegionRecord>;
export declare function upsertRegion(input: {
    id: string;
    code: string;
    name: string;
    marketScope: string;
    deploymentTarget: string;
    metadata?: Record<string, unknown>;
}): Promise<void>;
