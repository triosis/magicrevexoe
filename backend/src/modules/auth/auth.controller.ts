import type { CookieOptions, Request, Response } from 'express';
import { env } from '../../config/env';
import { recordAuditEvent } from '../audit/audit.service';
import { getRequestMetadata } from '../../utils/request-metadata';
import { AppError } from '../../utils/app-error';
import { login, logout, refreshSession, registerClient } from './auth.service';

const REFRESH_COOKIE = 'magicreview_refresh';
const cookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'strict',
  path: '/api/v1/auth',
};

function publicUser(user: NonNullable<Request['auth']>) {
  return {
    id: user.userId,
    email: user.email,
    accountId: user.accountId,
    accountType: user.accountType,
    role: user.role,
    permissions: user.permissions,
    tenant: {
      resellerId: user.resellerId,
      subResellerId: user.subResellerId,
      clientId: user.clientId,
    },
  };
}

export async function register(
  request: Request,
  response: Response,
): Promise<void> {
  const result = await registerClient(request.body);
  response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
  await recordAuditEvent({
    actorUserId: result.user.userId,
    actorAccountId: result.user.accountId,
    tenant: result.user,
    eventType: 'USER_CREATED',
    entityType: 'USER',
    entityId: result.user.userId,
    ...getRequestMetadata(request),
  });
  response.status(201).json({
    success: true,
    accessToken: result.accessToken,
    user: publicUser(result.user),
  });
}

export async function loginUser(
  request: Request,
  response: Response,
): Promise<void> {
  try {
    const result = await login(request.body.email, request.body.password);
    response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
    await recordAuditEvent({
      actorUserId: result.user.userId,
      actorAccountId: result.user.accountId,
      tenant: result.user,
      eventType: 'LOGIN_SUCCESS',
      entityType: 'USER',
      entityId: result.user.userId,
      ...getRequestMetadata(request),
    });
    response.json({
      success: true,
      accessToken: result.accessToken,
      user: publicUser(result.user),
    });
  } catch (error) {
    if (error instanceof AppError && error.code === 'INVALID_CREDENTIALS') {
      await recordAuditEvent({
        eventType: 'LOGIN_FAILED',
        entityType: 'USER',
        newValue: { email: request.body.email },
        ...getRequestMetadata(request),
      });
    }
    throw error;
  }
}

export async function refresh(
  request: Request,
  response: Response,
): Promise<void> {
  const rawToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
  if (!rawToken)
    throw new AppError(
      401,
      'REFRESH_TOKEN_REQUIRED',
      'Refresh token is required',
    );
  const result = await refreshSession(rawToken);
  response.cookie(REFRESH_COOKIE, result.refreshToken, cookieOptions);
  response.json({ success: true, accessToken: result.accessToken });
}

export async function logoutUser(
  request: Request,
  response: Response,
): Promise<void> {
  const rawToken = request.cookies?.[REFRESH_COOKIE] as string | undefined;
  await logout(rawToken);
  response.clearCookie(REFRESH_COOKIE, cookieOptions);
  await recordAuditEvent({
    actorUserId: request.auth?.userId,
    actorAccountId: request.auth?.accountId,
    tenant: request.auth,
    eventType: 'LOGOUT',
    entityType: 'USER',
    entityId: request.auth?.userId,
    ...getRequestMetadata(request),
  });
  response.json({ success: true });
}

export function me(request: Request, response: Response): void {
  response.json({ success: true, user: publicUser(request.auth!) });
}
