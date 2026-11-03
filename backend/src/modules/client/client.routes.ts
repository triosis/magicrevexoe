import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate.middleware';
import { authorize } from '../../middleware/authorize.middleware';
import { tenantScope } from '../../middleware/tenant-scope.middleware';
import { asyncHandler } from '../../utils/async-handler';
import { getClient, getClients } from './client.controller';

export const clientRouter = Router();

clientRouter.use(authenticate, authorize('client.view'), tenantScope);
clientRouter.get('/', asyncHandler(getClients));
clientRouter.get('/:id', asyncHandler(getClient));
