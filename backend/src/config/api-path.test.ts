import { describe, expect, it } from 'vitest';
import { getApiRouterMountPaths, isPassengerRuntime } from './api-path';

describe('API mount paths', () => {
  it('uses only the canonical public path outside Passenger', () => {
    expect(getApiRouterMountPaths('/api', false)).toEqual(['/api/v1']);
  });

  it('adds the stripped internal path under Passenger', () => {
    expect(getApiRouterMountPaths('/api', true)).toEqual(['/api/v1', '/v1']);
  });

  it('detects Passenger independently of NODE_ENV', () => {
    expect(isPassengerRuntime({ NODE_ENV: 'production' })).toBe(false);
    expect(isPassengerRuntime({ PASSENGER_BASE_URI: '/api' })).toBe(true);
  });
});
