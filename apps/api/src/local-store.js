"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteAssetRecord = exports.listAssets = exports.getAsset = exports.updateCustomer = exports.summarizeUsageByProduct = exports.summarizeUsageByCustomer = exports.summarizeUsageByAction = exports.summarizeUsage = exports.revokeApiKey = exports.recordUsageEvent = exports.listUsageEvents = exports.listCustomers = exports.getCustomer = exports.createCustomer = void 0;
exports.createApiKey = createApiKey;
exports.authenticateApiKey = authenticateApiKey;
exports.listApiKeys = listApiKeys;
exports.getConfigStatus = getConfigStatus;
exports.createAssetRecord = createAssetRecord;
const storage_1 = require("@stacklane/storage");
Object.defineProperty(exports, "createCustomer", { enumerable: true, get: function () { return storage_1.createCustomer; } });
Object.defineProperty(exports, "deleteAssetRecord", { enumerable: true, get: function () { return storage_1.deleteAssetRecord; } });
Object.defineProperty(exports, "getAsset", { enumerable: true, get: function () { return storage_1.getAsset; } });
Object.defineProperty(exports, "getCustomer", { enumerable: true, get: function () { return storage_1.getCustomer; } });
Object.defineProperty(exports, "listAssets", { enumerable: true, get: function () { return storage_1.listAssets; } });
Object.defineProperty(exports, "listCustomers", { enumerable: true, get: function () { return storage_1.listCustomers; } });
Object.defineProperty(exports, "listUsageEvents", { enumerable: true, get: function () { return storage_1.listUsageEvents; } });
Object.defineProperty(exports, "recordUsageEvent", { enumerable: true, get: function () { return storage_1.recordUsageEvent; } });
Object.defineProperty(exports, "revokeApiKey", { enumerable: true, get: function () { return storage_1.revokeApiKey; } });
Object.defineProperty(exports, "summarizeUsage", { enumerable: true, get: function () { return storage_1.summarizeUsage; } });
Object.defineProperty(exports, "summarizeUsageByAction", { enumerable: true, get: function () { return storage_1.summarizeUsageByAction; } });
Object.defineProperty(exports, "summarizeUsageByCustomer", { enumerable: true, get: function () { return storage_1.summarizeUsageByCustomer; } });
Object.defineProperty(exports, "summarizeUsageByProduct", { enumerable: true, get: function () { return storage_1.summarizeUsageByProduct; } });
Object.defineProperty(exports, "updateCustomer", { enumerable: true, get: function () { return storage_1.updateCustomer; } });
function createApiKey(input) {
    return (0, storage_1.createApiKeyRecord)(input);
}
function authenticateApiKey(rawKey) {
    const apiKey = (0, storage_1.verifyStoredApiKey)(rawKey);
    if (apiKey)
        (0, storage_1.touchApiKeyLastUsed)(apiKey.id);
    return apiKey;
}
function listApiKeys(customerId) {
    return (0, storage_1.listApiKeys)(customerId ? { customerId } : undefined);
}
function getConfigStatus() {
    return {
        databaseUrl: process.env.DATABASE_URL ? 'present' : 'missing',
        storageRoot: process.env.STACKLANE_STORAGE_ROOT ? 'present' : 'default',
        maxFileSizeBytes: process.env.STACKLANE_MAX_FILE_SIZE_BYTES ? 'present' : 'default',
    };
}
function createAssetRecord(input) {
    let storagePath = `${input.product}/${input.filename}`;
    let checksum;
    let sizeBytes = 0;
    if (input.bytesBase64) {
        const buffer = Buffer.from(input.bytesBase64, 'base64');
        sizeBytes = buffer.byteLength;
        const stored = (0, storage_1.saveLocalFile)({
            product: input.product,
            filename: input.filename,
            buffer,
            contentType: input.contentType,
        });
        storagePath = stored.storagePath;
        checksum = stored.checksum;
    }
    return (0, storage_1.createAssetRecord)({
        customerId: input.customerId,
        product: input.product,
        filename: input.filename,
        contentType: input.contentType,
        sizeBytes,
        storagePath,
        publicUrl: input.publicUrl,
        checksum,
        metadata: input.metadata,
    });
}
//# sourceMappingURL=local-store.js.map