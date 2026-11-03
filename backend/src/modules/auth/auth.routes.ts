import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticate } from '../../middleware/authenticate.middleware';
import { validate } from '../../middleware/validate.middleware';
import { asyncHandler } from '../../utils/async-handler';
import {
  loginUser,
  logoutUser,
  me,
  refresh,
  register,
} from './auth.controller';
import { loginSchema, registerSchema } from './auth.schemas';

export const authRouter = Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    code: 'RATE_LIMITED',
    message: 'Too many authentication attempts',
  },
});

authRouter.post(
  '/register',
  authLimiter,
  validate(registerSchema),
  asyncHandler(register),
);
authRouter.post(
  '/login',
  authLimiter,
  validate(loginSchema),
  asyncHandler(loginUser),
);
authRouter.post('/refresh', authLimiter, asyncHandler(refresh));
authRouter.post('/logout', authenticate, asyncHandler(logoutUser));
authRouter.get('/me', authenticate, me);
