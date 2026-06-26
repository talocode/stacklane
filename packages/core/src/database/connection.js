"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maskDatabaseUrl = maskDatabaseUrl;
exports.validateDatabaseUrl = validateDatabaseUrl;
const url_1 = require("url");
function maskDatabaseUrl(url) {
    try {
        const parsed = new url_1.URL(url);
        if (parsed.password) {
            parsed.password = '***';
        }
        return parsed.toString();
    }
    catch {
        return '***';
    }
}
function validateDatabaseUrl(url) {
    if (!url || typeof url !== 'string') {
        return { valid: false, error: 'databaseUrl is required' };
    }
    try {
        const parsed = new url_1.URL(url);
        if (!['postgres:', 'postgresql:', 'sqlite:'].includes(parsed.protocol)) {
            return { valid: false, error: 'databaseUrl must use postgres://, postgresql://, or sqlite:// protocol' };
        }
        return { valid: true };
    }
    catch {
        return { valid: false, error: 'databaseUrl is not a valid URL' };
    }
}
//# sourceMappingURL=connection.js.map