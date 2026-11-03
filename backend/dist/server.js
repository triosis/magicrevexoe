"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const app_1 = require("./app");
const env_1 = require("./config/env");
const database_1 = require("./config/database");
const logger_1 = require("./config/logger");
const server = app_1.app.listen(env_1.env.PORT, () => {
    logger_1.logger.info({ port: env_1.env.PORT }, 'MagicReview API is running');
});
async function shutdown(signal) {
    logger_1.logger.info({ signal }, 'Shutting down');
    server.close(async (error) => {
        if (error) {
            logger_1.logger.error({ err: error }, 'HTTP server shutdown failed');
            process.exit(1);
        }
        await database_1.databasePool.end();
        process.exit(0);
    });
}
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
//# sourceMappingURL=server.js.map