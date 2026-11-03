import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from '../modules/auth/auth.routes';
import { auditRouter } from '../modules/audit/audit.routes';
import { clientRouter } from '../modules/client/client.routes';

export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/clients', clientRouter);
apiRouter.use('/audit-logs', auditRouter);
