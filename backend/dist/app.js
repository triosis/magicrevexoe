"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const env_1 = require("./config/env");
const error_middleware_1 = require("./middleware/error.middleware");
const not_found_middleware_1 = require("./middleware/not-found.middleware");
const routes_1 = require("./routes");
const api_path_1 = require("./config/api-path");
function createApp(options = {}) {
    const app = (0, express_1.default)();
    const passengerMounted = options.passengerMounted ?? (0, api_path_1.isPassengerRuntime)(process.env);
    const routerMountPaths = (0, api_path_1.getApiRouterMountPaths)(env_1.env.API_BASE_PATH, passengerMounted);
    app.disable('x-powered-by');
    app.set('trust proxy', 1);
    app.set('apiBasePath', env_1.env.API_BASE_PATH);
    app.set('apiRouterMountPaths', routerMountPaths);
    app.use((0, helmet_1.default)());
    app.use((0, cors_1.default)({
        origin: env_1.env.CORS_ORIGIN,
        credentials: true,
    }));
    app.use(express_1.default.json({ limit: '1mb' }));
    app.use(express_1.default.urlencoded({ extended: true, limit: '1mb' }));
    app.use((0, cookie_parser_1.default)());
    app.use(routerMountPaths, routes_1.apiRouter);
    app.use(not_found_middleware_1.notFoundHandler);
    app.use(error_middleware_1.errorHandler);
    return app;
}
exports.app = createApp();
//# sourceMappingURL=app.js.map