"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.API_VERSION_PATH = void 0;
exports.isPassengerRuntime = isPassengerRuntime;
exports.getApiRouterMountPaths = getApiRouterMountPaths;
exports.API_VERSION_PATH = '/v1';
function isPassengerRuntime(environment) {
    return (environment.PASSENGER_APP_ENV !== undefined ||
        environment.PASSENGER_BASE_URI !== undefined);
}
function getApiRouterMountPaths(apiBasePath, passengerMounted) {
    const publicMountPath = apiBasePath === '/'
        ? exports.API_VERSION_PATH
        : `${apiBasePath}${exports.API_VERSION_PATH}`;
    // Passenger installations differ in whether the application base URI is
    // removed from PATH_INFO. Accept the stripped path only inside Passenger,
    // while always retaining the single canonical public /api/v1 mount.
    if (passengerMounted && publicMountPath !== exports.API_VERSION_PATH) {
        return [publicMountPath, exports.API_VERSION_PATH];
    }
    return [publicMountPath];
}
//# sourceMappingURL=api-path.js.map