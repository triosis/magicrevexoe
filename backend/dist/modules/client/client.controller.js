"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getClients = getClients;
exports.getClient = getClient;
const app_error_1 = require("../../utils/app-error");
const client_repository_1 = require("./client.repository");
async function getClients(request, response) {
    response.json({ success: true, data: await (0, client_repository_1.listClients)(request.tenant) });
}
async function getClient(request, response) {
    const rawId = request.params.id;
    const id = Array.isArray(rawId) ? rawId[0] : rawId;
    if (!id)
        throw new app_error_1.AppError(400, 'INVALID_CLIENT_ID', 'Client ID is required');
    const client = await (0, client_repository_1.findClientById)(id, request.tenant);
    if (!client)
        throw new app_error_1.AppError(404, 'RESOURCE_NOT_FOUND', 'Resource not found');
    response.json({ success: true, data: client });
}
//# sourceMappingURL=client.controller.js.map