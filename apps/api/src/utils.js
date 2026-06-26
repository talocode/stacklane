"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeId = makeId;
exports.safeSlug = safeSlug;
exports.hashValue = hashValue;
exports.hashPassword = hashPassword;
exports.verifyPassword = verifyPassword;
exports.createSessionToken = createSessionToken;
exports.createApiSecret = createApiSecret;
const node_crypto_1 = require("node:crypto");
function makeId(prefix) {
    return `${prefix}_${(0, node_crypto_1.randomUUID)().replace(/-/g, '').slice(0, 20)}`;
}
function safeSlug(value) {
    return value
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9-\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '');
}
function hashValue(value) {
    return (0, node_crypto_1.createHash)('sha256').update(value).digest('hex');
}
function hashPassword(password) {
    const salt = (0, node_crypto_1.randomBytes)(16).toString('hex');
    const derived = (0, node_crypto_1.scryptSync)(password, salt, 64).toString('hex');
    return `${salt}:${derived}`;
}
function verifyPassword(password, stored) {
    const [salt, derived] = stored.split(':');
    if (!salt || !derived)
        return false;
    const next = (0, node_crypto_1.scryptSync)(password, salt, 64);
    const existing = Buffer.from(derived, 'hex');
    if (next.length !== existing.length)
        return false;
    return (0, node_crypto_1.timingSafeEqual)(next, existing);
}
function createSessionToken() {
    return (0, node_crypto_1.randomBytes)(32).toString('base64url');
}
function createApiSecret(prefix) {
    const secretPart = (0, node_crypto_1.randomBytes)(24).toString('base64url');
    return `${prefix}.${secretPart}`;
}
//# sourceMappingURL=utils.js.map