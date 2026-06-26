"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpError = void 0;
exports.sendJson = sendJson;
exports.sendData = sendData;
exports.sendError = sendError;
exports.parseBody = parseBody;
exports.parseCookies = parseCookies;
exports.setSessionCookie = setSessionCookie;
exports.clearSessionCookie = clearSessionCookie;
class HttpError extends Error {
    statusCode;
    code;
    details;
    constructor(statusCode, code, message, details) {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
exports.HttpError = HttpError;
function sendJson(res, statusCode, payload) {
    const apiOrigin = process.env.WEB_ORIGIN || 'http://localhost:3000';
    res.writeHead(statusCode, {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': apiOrigin,
        'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS',
        'access-control-allow-headers': 'content-type',
        'access-control-allow-credentials': 'true'
    });
    res.end(JSON.stringify(payload));
}
function sendData(res, statusCode, data) {
    sendJson(res, statusCode, { data });
}
function sendError(res, error) {
    sendJson(res, error.statusCode, {
        error: {
            code: error.code,
            message: error.message,
            details: error.details
        }
    });
}
async function parseBody(req) {
    return new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (chunk) => {
            raw += chunk;
        });
        req.on('end', () => {
            if (!raw)
                return resolve({});
            try {
                resolve(JSON.parse(raw));
            }
            catch {
                reject(new HttpError(400, 'INVALID_JSON', 'Request body must be valid JSON.'));
            }
        });
        req.on('error', reject);
    });
}
function parseCookies(req) {
    const rawCookie = req.headers.cookie || '';
    const pairs = rawCookie.split(';').map((part) => part.trim()).filter(Boolean);
    const output = {};
    for (const pair of pairs) {
        const [key, ...rest] = pair.split('=');
        output[key] = decodeURIComponent(rest.join('='));
    }
    return output;
}
function setSessionCookie(res, token) {
    res.setHeader('Set-Cookie', `sl_session=${encodeURIComponent(token)}; HttpOnly; Path=/; SameSite=Lax; Max-Age=604800`);
}
function clearSessionCookie(res) {
    res.setHeader('Set-Cookie', 'sl_session=; HttpOnly; Path=/; SameSite=Lax; Max-Age=0');
}
//# sourceMappingURL=http.js.map