"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.localStoragePaths = void 0;
exports.validateMimeType = validateMimeType;
exports.sanitizeFilenameForStorage = sanitizeFilenameForStorage;
exports.generateStorageKey = generateStorageKey;
exports.saveLocalFile = saveLocalFile;
exports.readLocalFile = readLocalFile;
exports.deleteLocalFile = deleteLocalFile;
exports.createCustomer = createCustomer;
exports.listCustomers = listCustomers;
exports.getCustomer = getCustomer;
exports.updateCustomer = updateCustomer;
exports.createApiKeyRecord = createApiKeyRecord;
exports.listApiKeys = listApiKeys;
exports.revokeApiKey = revokeApiKey;
exports.verifyStoredApiKey = verifyStoredApiKey;
exports.touchApiKeyLastUsed = touchApiKeyLastUsed;
exports.recordUsageEvent = recordUsageEvent;
exports.listUsageEvents = listUsageEvents;
exports.summarizeUsage = summarizeUsage;
exports.summarizeUsageByCustomer = summarizeUsageByCustomer;
exports.summarizeUsageByProduct = summarizeUsageByProduct;
exports.summarizeUsageByAction = summarizeUsageByAction;
exports.createAssetRecord = createAssetRecord;
exports.listAssets = listAssets;
exports.getAsset = getAsset;
exports.deleteAssetRecord = deleteAssetRecord;
const crypto = __importStar(require("node:crypto"));
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const core_1 = require("@stacklane/core");
const ROOT_DIR = path.resolve(process.cwd(), '.stacklane');
const DEFAULT_FILES_ROOT = '.stacklane/files';
const FILES_DIR = path.join(ROOT_DIR, 'files');
const CUSTOMERS_FILE = path.join(ROOT_DIR, 'customers.json');
const API_KEYS_FILE = path.join(ROOT_DIR, 'api-keys.json');
const USAGE_EVENTS_FILE = path.join(ROOT_DIR, 'usage-events.json');
const ASSETS_FILE = path.join(ROOT_DIR, 'assets.json');
const DEFAULT_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
    'image/png',
    'image/jpeg',
    'image/webp',
    'application/json',
    'text/plain',
]);
exports.localStoragePaths = {
    root: ROOT_DIR,
    files: FILES_DIR,
    customers: CUSTOMERS_FILE,
    apiKeys: API_KEYS_FILE,
    usageEvents: USAGE_EVENTS_FILE,
    assets: ASSETS_FILE,
};
function ensureDir(dir) {
    if (!fs.existsSync(dir))
        fs.mkdirSync(dir, { recursive: true });
}
function ensureRoot() {
    ensureDir(ROOT_DIR);
    ensureDir(FILES_DIR);
}
function readCollection(filePath) {
    ensureRoot();
    if (!fs.existsSync(filePath))
        return [];
    return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}
function writeCollection(filePath, items) {
    ensureRoot();
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf-8');
}
function makeId(prefix) {
    return `${prefix}_${crypto.randomUUID().replace(/-/g, '').slice(0, 20)}`;
}
function validateMimeType(mimeType) {
    return ALLOWED_MIME_TYPES.has(mimeType);
}
function sanitizeFilenameForStorage(name) {
    const basename = path.basename(name);
    return basename.replace(/[^a-zA-Z0-9._-]/g, '_').replace(/_+/g, '_').replace(/^_+|_+$/g, '').slice(0, 120) || 'file';
}
function generateStorageKey(product, filename) {
    return `${product}/${crypto.randomUUID()}-${filename}`;
}
function ensureSafeStoragePath(storagePath) {
    if (storagePath.includes('..') || path.isAbsolute(storagePath)) {
        throw new Error('Unsafe storage path.');
    }
}
function maxFileSizeBytes() {
    return Number(process.env.STACKLANE_MAX_FILE_SIZE_BYTES || DEFAULT_MAX_FILE_SIZE_BYTES);
}
function saveLocalFile(input) {
    if (!validateMimeType(input.contentType)) {
        throw new Error(`Unsupported content type: ${input.contentType}`);
    }
    if (input.buffer.byteLength > maxFileSizeBytes()) {
        throw new Error(`File exceeds max size of ${maxFileSizeBytes()} bytes`);
    }
    const filename = sanitizeFilenameForStorage(input.filename);
    const storagePath = generateStorageKey(input.product, filename);
    ensureSafeStoragePath(storagePath);
    const absolutePath = path.join(FILES_DIR, storagePath);
    ensureDir(path.dirname(absolutePath));
    fs.writeFileSync(absolutePath, input.buffer);
    const checksum = crypto.createHash('sha256').update(input.buffer).digest('hex');
    return { filename, storagePath, absolutePath, checksum };
}
function readLocalFile(storagePath) {
    ensureSafeStoragePath(storagePath);
    const absolutePath = path.join(FILES_DIR, storagePath);
    if (!fs.existsSync(absolutePath))
        return null;
    return fs.readFileSync(absolutePath);
}
function deleteLocalFile(storagePath) {
    ensureSafeStoragePath(storagePath);
    const absolutePath = path.join(FILES_DIR, storagePath);
    if (!fs.existsSync(absolutePath))
        return false;
    fs.unlinkSync(absolutePath);
    return true;
}
function createCustomer(input) {
    const items = readCollection(CUSTOMERS_FILE);
    const now = new Date().toISOString();
    const customer = {
        id: makeId('cust'),
        name: input.name,
        email: input.email,
        externalRef: input.externalRef,
        status: input.status || 'active',
        createdAt: now,
        updatedAt: now,
    };
    items.push(customer);
    writeCollection(CUSTOMERS_FILE, items);
    return customer;
}
function listCustomers() {
    return readCollection(CUSTOMERS_FILE);
}
function getCustomer(id) {
    return listCustomers().find((item) => item.id === id);
}
function updateCustomer(id, patch) {
    const items = listCustomers();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1)
        return null;
    const updated = { ...items[index], ...patch, updatedAt: new Date().toISOString() };
    items[index] = updated;
    writeCollection(CUSTOMERS_FILE, items);
    return updated;
}
function createApiKeyRecord(input) {
    const items = readCollection(API_KEYS_FILE);
    const { rawKey, record } = (0, core_1.generateCustomerApiKey)(input.customerId, input.name, input.mode || 'dev', input.scopes || ['*']);
    const apiKey = { id: makeId('key'), ...record };
    items.push(apiKey);
    writeCollection(API_KEYS_FILE, items);
    return { rawKey, apiKey };
}
function listApiKeys(filters) {
    return readCollection(API_KEYS_FILE).filter((item) => !filters?.customerId || item.customerId === filters.customerId);
}
function revokeApiKey(id) {
    const items = listApiKeys();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1)
        return null;
    const updated = { ...items[index], status: 'revoked', updatedAt: new Date().toISOString() };
    items[index] = updated;
    writeCollection(API_KEYS_FILE, items);
    return updated;
}
function verifyStoredApiKey(rawKey) {
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    return listApiKeys().find((item) => item.keyHash === keyHash && item.status === 'active') || null;
}
function touchApiKeyLastUsed(id) {
    const items = listApiKeys();
    const index = items.findIndex((item) => item.id === id);
    if (index === -1)
        return null;
    const updated = { ...items[index], lastUsedAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    items[index] = updated;
    writeCollection(API_KEYS_FILE, items);
    return updated;
}
function recordUsageEvent(input) {
    const items = readCollection(USAGE_EVENTS_FILE);
    const event = { id: makeId('usage'), ...input, createdAt: new Date().toISOString() };
    items.push(event);
    writeCollection(USAGE_EVENTS_FILE, items);
    return event;
}
function listUsageEvents(filters) {
    return readCollection(USAGE_EVENTS_FILE).filter((event) => {
        if (filters?.customerId && event.customerId !== filters.customerId)
            return false;
        if (filters?.product && event.product !== filters.product)
            return false;
        if (filters?.action && event.action !== filters.action)
            return false;
        if (filters?.from && event.createdAt < filters.from)
            return false;
        if (filters?.to && event.createdAt > filters.to)
            return false;
        return true;
    });
}
function summarizeUsage(filters) {
    const events = listUsageEvents(filters);
    return (0, core_1.summarizeUsageEvents)(events, (event) => `${event.product}:${event.action}`, filters);
}
function summarizeUsageByCustomer(filters) {
    const events = listUsageEvents(filters);
    return (0, core_1.summarizeUsageEvents)(events, (event) => event.customerId || 'unassigned', filters);
}
function summarizeUsageByProduct(filters) {
    const events = listUsageEvents(filters);
    return (0, core_1.summarizeUsageEvents)(events, (event) => event.product, filters);
}
function summarizeUsageByAction(filters) {
    const events = listUsageEvents(filters);
    return (0, core_1.summarizeUsageEvents)(events, (event) => event.action, filters);
}
function createAssetRecord(input) {
    const items = readCollection(ASSETS_FILE);
    const now = new Date().toISOString();
    const asset = { id: makeId('asset'), ...input, createdAt: now, updatedAt: now };
    items.push(asset);
    writeCollection(ASSETS_FILE, items);
    return asset;
}
function listAssets(filters) {
    return readCollection(ASSETS_FILE).filter((asset) => {
        if (filters?.customerId && asset.customerId !== filters.customerId)
            return false;
        if (filters?.product && asset.product !== filters.product)
            return false;
        return true;
    });
}
function getAsset(id) {
    return listAssets().find((asset) => asset.id === id);
}
function deleteAssetRecord(id) {
    const items = listAssets();
    const index = items.findIndex((asset) => asset.id === id);
    if (index === -1)
        return null;
    const [removed] = items.splice(index, 1);
    writeCollection(ASSETS_FILE, items);
    return removed;
}
//# sourceMappingURL=local.js.map