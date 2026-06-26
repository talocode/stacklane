"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    port: Number(process.env.PORT || 4000),
    databaseUrl: process.env.DATABASE_URL || 'postgres://stacklane:stacklane@localhost:5432/stacklane',
    webOrigin: process.env.WEB_ORIGIN || 'http://localhost:3000'
};
//# sourceMappingURL=config.js.map