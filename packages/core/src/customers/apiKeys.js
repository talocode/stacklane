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
exports.generateApiKey = generateApiKey;
exports.generateCustomerApiKey = generateCustomerApiKey;
exports.hashApiKey = hashApiKey;
exports.verifyApiKey = verifyApiKey;
const crypto = __importStar(require("node:crypto"));
function generateApiKey(mode = 'dev') {
    return `sk_lane_${mode}_${crypto.randomBytes(32).toString('base64url')}`;
}
function generateCustomerApiKey(customerId, name, mode = 'dev', scopes = ['*']) {
    const rawKey = generateApiKey(mode);
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
    const keyPrefix = rawKey.slice(0, 20) + '...';
    const now = new Date().toISOString();
    return {
        rawKey,
        record: {
            customerId,
            name,
            keyPrefix,
            keyHash,
            status: 'active',
            scopes,
            createdAt: now,
            updatedAt: now,
        },
    };
}
function hashApiKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
}
function verifyApiKey(rawKey, hashedKey) {
    const computed = crypto.createHash('sha256').update(rawKey).digest('hex');
    if (computed.length !== hashedKey.length)
        return false;
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hashedKey));
}
//# sourceMappingURL=apiKeys.js.map