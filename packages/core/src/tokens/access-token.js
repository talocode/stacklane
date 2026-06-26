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
exports.generateAccessToken = generateAccessToken;
exports.hashToken = hashToken;
exports.verifyToken = verifyToken;
exports.extractTokenFromHeader = extractTokenFromHeader;
const crypto = __importStar(require("crypto"));
const TOKEN_PREFIX = 'sk_lane_';
const DEV_PREFIX = 'sk_lane_dev_';
const TOKEN_LENGTH = 48;
function generateAccessToken(projectId, name, isDev = false) {
    const randomBytes = crypto.randomBytes(TOKEN_LENGTH);
    const rawToken = (isDev ? DEV_PREFIX : TOKEN_PREFIX) + randomBytes.toString('base64url');
    const tokenHash = hashToken(rawToken);
    const tokenPrefix = rawToken.slice(0, 12) + '...';
    return {
        rawToken,
        record: {
            projectId,
            tokenPrefix,
            tokenHash,
            name,
            scopes: ['*'],
            status: 'active',
            createdAt: new Date().toISOString(),
            lastUsedAt: null,
            revokedAt: null,
        },
    };
}
function hashToken(token) {
    return crypto.createHash('sha256').update(token).digest('hex');
}
function verifyToken(rawToken, hashedToken) {
    const computed = hashToken(rawToken);
    return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hashedToken));
}
function extractTokenFromHeader(request) {
    const authHeader = request.headers.get('authorization');
    if (authHeader?.startsWith('Bearer ')) {
        return authHeader.slice(7);
    }
    const apiKey = request.headers.get('x-api-key') || request.headers.get('x-stacklane-api-key');
    return apiKey || null;
}
//# sourceMappingURL=access-token.js.map