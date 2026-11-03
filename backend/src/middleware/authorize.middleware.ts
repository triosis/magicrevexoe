import type { RequestHandler } from 'express';
import { recordAuditEvent } from '../modules/audit/audit.service';
import { AppError } from '../utils/app-error';
import { getRequestMetadata } from '../utils/request-metadata';

export function authorize(permission: string): RequestHandler {
  return async (request, _response, next) => {
    if (request.auth?.permissions.includes(permission)) {
      next();
      return;
    }
    if (request.auth) {
      await recordAuditEvent({
        actorUserId: request.auth.userId,
        actorAccountId: request.auth.accountId,
        tenant: request.auth,
        eventType: 'PERMISSION_DENIED',
        entityType: 'PERMISSION',
        newValue: { permission },
        ...getRequestMetadata(request),
      });
    }
    next(
      new AppError(
        403,
        'PERMISSION_DENIED',
        'You do not have permission to perform this action',
      ),
    );
  };
}
