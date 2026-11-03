import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

vi.mock('../modules/audit/audit.service', () => ({
  recordAuditEvent: vi.fn(),
}));

import { authenticate } from './authenticate.middleware';
import { authorize } from './authorize.middleware';
import { requireAccount } from './require-account.middleware';
import { AppError } from '../utils/app-error';

function responseStub(): Response {
  return {} as Response;
}

describe('protected API middleware', () => {
  it('returns 401 for an invalid JWT', async () => {
    const request = {
      get: () => 'Bearer invalid.jwt.token',
    } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    await authenticate(request, responseStub(), next);
    const error = vi.mocked(next).mock.calls[0]?.[0] as unknown as AppError;
    expect(error.statusCode).toBe(401);
  });

  it('returns 403 when a required permission is missing', async () => {
    const request = {
      auth: {
        userId: '1',
        email: 'staff@example.com',
        accountId: '2',
        accountType: 'CLIENT',
        role: 'CLIENT_STAFF',
        permissions: [],
        resellerId: null,
        subResellerId: null,
        clientId: '3',
      },
      ip: '127.0.0.1',
      get: () => undefined,
    } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    await authorize('billing.manage')(request, responseStub(), next);
    const error = vi.mocked(next).mock.calls[0]?.[0] as unknown as AppError;
    expect(error.statusCode).toBe(403);
  });

  it('does not allow a Sub-Reseller to create another Sub-Reseller', () => {
    const request = {
      auth: { accountType: 'SUB_RESELLER' },
    } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    requireAccount('SUPER_ADMIN', 'RESELLER')(request, responseStub(), next);
    expect(
      (vi.mocked(next).mock.calls[0]?.[0] as unknown as AppError).statusCode,
    ).toBe(403);
  });

  it('does not allow a Client to access Reseller APIs', () => {
    const request = { auth: { accountType: 'CLIENT' } } as unknown as Request;
    const next = vi.fn() as unknown as NextFunction;
    requireAccount('SUPER_ADMIN', 'RESELLER')(request, responseStub(), next);
    expect(
      (vi.mocked(next).mock.calls[0]?.[0] as unknown as AppError).statusCode,
    ).toBe(403);
  });
});
