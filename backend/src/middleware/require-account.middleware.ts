import type { RequestHandler } from 'express';
import type { AccountType } from '../types/auth';
import { AppError } from '../utils/app-error';

export function requireAccount(...types: AccountType[]): RequestHandler {
  return (request, _response, next) => {
    if (!request.auth || !types.includes(request.auth.accountType)) {
      next(
        new AppError(
          403,
          'ACCOUNT_TYPE_FORBIDDEN',
          'This account type cannot access this resource',
        ),
      );
      return;
    }
    next();
  };
}
