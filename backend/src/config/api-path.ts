export const API_VERSION_PATH = '/v1';

export function isPassengerRuntime(environment: NodeJS.ProcessEnv): boolean {
  return (
    environment.PASSENGER_APP_ENV !== undefined ||
    environment.PASSENGER_BASE_URI !== undefined
  );
}

export function getApiRouterMountPaths(
  apiBasePath: string,
  passengerMounted: boolean,
): string[] {
  const publicMountPath =
    apiBasePath === '/'
      ? API_VERSION_PATH
      : `${apiBasePath}${API_VERSION_PATH}`;

  // Passenger installations differ in whether the application base URI is
  // removed from PATH_INFO. Accept the stripped path only inside Passenger,
  // while always retaining the single canonical public /api/v1 mount.
  if (passengerMounted && publicMountPath !== API_VERSION_PATH) {
    return [publicMountPath, API_VERSION_PATH];
  }

  return [publicMountPath];
}
