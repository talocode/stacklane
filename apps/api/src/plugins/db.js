"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dbPlugin = void 0;
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const client_1 = require("../db/client");
exports.dbPlugin = (0, fastify_plugin_1.default)(async (fastify, options) => {
    const { db, pool } = (0, client_1.createDb)(options.databaseUrl);
    fastify.decorate("db", db);
    fastify.addHook("onClose", async () => {
        await pool.end();
    });
});
//# sourceMappingURL=db.js.map