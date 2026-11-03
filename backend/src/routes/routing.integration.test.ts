import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import { afterEach, describe, expect, it } from 'vitest';
import { createApp } from '../app';

let server: Server | undefined;

afterEach(async () => {
  if (server)
    await new Promise<void>((resolve) => server!.close(() => resolve()));
  server = undefined;
});

async function request(
  app: Express,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  server = app.listen(0);
  await new Promise<void>((resolve) => server!.once('listening', resolve));
  const port = (server.address() as AddressInfo).port;
  return fetch(`http://127.0.0.1:${port}${path}`, init);
}

describe('API base-path routing', () => {
  it('serves the local development health URL at /api/v1/health', async () => {
    const response = await request(
      createApp({ passengerMounted: false }),
      '/api/v1/health',
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      service: 'magicreview-api',
    });
  });

  it('serves Passenger requests after /api is stripped from the internal URL', async () => {
    const response = await request(
      createApp({ passengerMounted: true }),
      '/v1/health',
    );
    expect(response.status).toBe(200);
  });

  it('serves Passenger requests when /api is retained in the internal URL', async () => {
    const response = await request(
      createApp({ passengerMounted: true }),
      '/api/v1/health',
    );
    expect(response.status).toBe(200);
  });

  it('does not duplicate the public API base prefix', async () => {
    const response = await request(
      createApp({ passengerMounted: false }),
      '/api/api/v1/health',
    );
    expect(response.status).toBe(404);
  });

  it('does not duplicate the API prefix when running under Passenger', async () => {
    const response = await request(
      createApp({ passengerMounted: true }),
      '/api/api/v1/health',
    );
    expect(response.status).toBe(404);
  });

  it('keeps the local login route mounted and validated', async () => {
    const response = await request(
      createApp({ passengerMounted: false }),
      '/api/v1/auth/login',
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: '{}',
      },
    );
    expect(response.status).toBe(400);
  });

  it('protects the local current-user route', async () => {
    const response = await request(
      createApp({ passengerMounted: false }),
      '/api/v1/auth/me',
    );
    expect(response.status).toBe(401);
  });
});
