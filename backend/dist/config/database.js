"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.databasePool = void 0;
exports.createDatabasePoolOptions = createDatabasePoolOptions;
const promise_1 = __importDefault(require("mysql2/promise"));
const env_1 = require("./env");
function createDatabasePoolOptions(config) {
    return {
        host: config.DB_HOST,
        port: config.DB_PORT,
        database: config.DB_NAME,
        user: config.DB_USER,
        password: config.DB_PASSWORD,
        waitForConnections: true,
        connectionLimit: 10,
        maxIdle: 10,
        idleTimeout: 60_000,
        queueLimit: 0,
        enableKeepAlive: true,
        supportBigNumbers: true,
        bigNumberStrings: true,
        multipleStatements: false,
    };
}
exports.databasePool = promise_1.default.createPool(createDatabasePoolOptions(env_1.env));
//# sourceMappingURL=database.js.map