import type { Request, Response } from 'express';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { loginMock, auditMock } = vi.hoisted(() => ({
  loginMock: vi.fn(),
  auditMock: vi.fn(),
}));

vi.mock('./auth.service', () => ({ login: loginMock }));
vi.mock('../audit/audit.service', () => ({ recordAuditEvent: auditMock }));

import { loginUser } from './auth.controller';

describe('authentication audit events', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a LOGIN_SUCCESS audit record after login', async () => {
    const user = {
      userId: '1',
      email: 'owner@example.com',
      accountId: '2',
      accountType: 'CLIENT' as const,
      role: 'CLIENT_OWNER',
      permissions: ['client.view'],
      resellerId: null,
      subResellerId: null,
      clientId: '3',
    };
    loginMock.mockResolvedValue({
      user,
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    const request = {
      body: { email: user.email, password: 'not-logged' },
      ip: '127.0.0.1',
      get: () => 'test-agent',
    } as unknown as Request;
    const response = {
      cookie: vi.fn(),
      json: vi.fn(),
    } as unknown as Response;

    await loginUser(request, response);

    expect(auditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: 'LOGIN_SUCCESS',
        actorUserId: '1',
        actorAccountId: '2',
      }),
    );
  });
});
