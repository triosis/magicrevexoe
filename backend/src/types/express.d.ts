import type { AuthenticatedUser, TenantContext } from './auth';

declare global {
  namespace Express {
    interface Request {
      auth?: AuthenticatedUser;
      tenant?: TenantContext;
    }
  }
}

export {};
