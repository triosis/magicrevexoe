import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { tenantScope } from '../../middleware/tenant-scope.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { getAuditLogs } from './audit.controller';

export const auditRouter = Router();

auditRouter.get(
  '/',
  authenticate,
  authorize('audit.view'),
  tenantScope,
  asyncHandler(getAuditLogs),
);
