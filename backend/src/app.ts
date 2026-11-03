import express, { type Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { errorHandler } from './middleware/error.middleware';
import { notFoundHandler } from './middleware/not-found.middleware';
import { apiRouter } from './routes';
import { getApiRouterMountPaths, isPassengerRuntime } from './config/api-path';

interface AppOptions {
  passengerMounted?: boolean;
}

export function createApp(options: AppOptions = {}): Express {
  const app = express();
  const passengerMounted =
    options.passengerMounted ?? isPassengerRuntime(process.env);
  const routerMountPaths = getApiRouterMountPaths(
    env.API_BASE_PATH,
    passengerMounted,
  );

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.set('apiBasePath', env.API_BASE_PATH);
  app.set('apiRouterMountPaths', routerMountPaths);
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());

  app.use(routerMountPaths, apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

export const app = createApp();
