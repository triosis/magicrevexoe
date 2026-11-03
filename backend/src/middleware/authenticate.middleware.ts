import type { RequestHandler } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { getAuthenticatedUser } from '../modules/auth/auth.repository';
import { verifyAccessToken } from '../modules/auth/token.service';
import { AppError } from '../utils/app-error';

export const authenticate: RequestHandler = async (
  request,
  _response,
  next,
) => {
  try {
    const header = request.get('authorization');
    if (!header?.startsWith('Bearer ')) {
      throw new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required',
      );
    }
    const claims = verifyAccessToken(header.slice(7));
    const user = await getAuthenticatedUser(claims.sub, claims.accountId);
    if (!user) throw new AppError(401, 'INVALID_TOKEN', 'Invalid access token');
    request.auth = user;
    next();
  } catch (error) {
    if (
      error instanceof JsonWebTokenError ||
      error instanceof TokenExpiredError
    ) {
      next(
        new AppError(401, 'INVALID_TOKEN', 'Invalid or expired access token'),
      );
      return;
    }
    next(error);
  }
};
