import type { RequestHandler } from 'express';
import { AppError } from '../utils/app-error';

export const tenantScope: RequestHandler = (request, _response, next) => {
  if (!request.auth) {
    next(
      new AppError(
        401,
        'AUTHENTICATION_REQUIRED',
        'Authentication is required',
      ),
    );
    return;
  }
  request.tenant = {
    accountId: request.auth.accountId,
    accountType: request.auth.accountType,
    resellerId: request.auth.resellerId,
    subResellerId: request.auth.subResellerId,
    clientId: request.auth.clientId,
  };
  next();
};
