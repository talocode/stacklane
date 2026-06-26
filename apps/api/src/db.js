"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const pg_1 = __importDefault(require("pg"));
const config_1 = require("./config");
const { Pool } = pg_1.default;
exports.db = new Pool({ connectionString: config_1.config.databaseUrl });
//# sourceMappingURL=db.js.map