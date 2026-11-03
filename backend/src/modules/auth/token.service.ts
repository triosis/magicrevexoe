import { createHash, randomUUID } from 'node:crypto';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../../config/env';
import type { AccessTokenClaims, AuthenticatedUser } from '../../types/auth';
import { AppError } from '../../utils/app-error';

interface RefreshTokenClaims {
  sub: string;
  accountId: string;
  jti: string;
  type: 'refresh';
}

function requireSecret(value: string | undefined, name: string): string {
  if (!value || value.length < 32) {
    throw new AppError(
      500,
      'AUTH_CONFIGURATION_ERROR',
      `${name} must contain at least 32 characters`,
    );
  }
  return value;
}

export function createAccessToken(user: AuthenticatedUser): string {
  return jwt.sign(
    { accountId: user.accountId, type: 'access' },
    requireSecret(env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
    {
      subject: user.userId,
      expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
    },
  );
}

export function createRefreshToken(user: AuthenticatedUser): {
  token: string;
  tokenId: string;
  expiresAt: Date;
} {
  const tokenId = randomUUID();
  const secret = requireSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET');
  const token = jwt.sign(
    { accountId: user.accountId, type: 'refresh' },
    secret,
    {
      subject: user.userId,
      jwtid: tokenId,
      expiresIn: env.JWT_REFRESH_EXPIRES_IN as SignOptions['expiresIn'],
    },
  );
  const decoded = jwt.decode(token);
  if (!decoded || typeof decoded === 'string' || !decoded.exp) {
    throw new AppError(
      500,
      'TOKEN_CREATION_FAILED',
      'Could not create refresh token',
    );
  }
  return { token, tokenId, expiresAt: new Date(decoded.exp * 1000) };
}

export function verifyAccessToken(token: string): AccessTokenClaims {
  const claims = jwt.verify(
    token,
    requireSecret(env.JWT_ACCESS_SECRET, 'JWT_ACCESS_SECRET'),
  );
  if (
    typeof claims === 'string' ||
    claims.type !== 'access' ||
    !claims.sub ||
    !claims.accountId
  ) {
    throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
  }
  return {
    sub: claims.sub,
    accountId: String(claims.accountId),
    type: 'access',
  };
}

export function verifyRefreshToken(token: string): RefreshTokenClaims {
  const claims = jwt.verify(
    token,
    requireSecret(env.JWT_REFRESH_SECRET, 'JWT_REFRESH_SECRET'),
  );
  if (
    typeof claims === 'string' ||
    claims.type !== 'refresh' ||
    !claims.sub ||
    !claims.accountId ||
    !claims.jti
  ) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  }
  return {
    sub: claims.sub,
    accountId: String(claims.accountId),
    jti: claims.jti,
    type: 'refresh',
  };
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
