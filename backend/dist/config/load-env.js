"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendEnvPath = void 0;
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
exports.backendEnvPath = node_path_1.default.resolve(__dirname, '..', '..', '.env');
// Values already supplied by cPanel or the shell always win. The file is optional.
dotenv_1.default.config({ path: exports.backendEnvPath, override: false, quiet: true });
//# sourceMappingURL=load-env.js.map