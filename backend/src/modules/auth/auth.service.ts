import bcrypt from 'bcrypt';
import { AppError } from '../../utils/app-error';
import type { AuthenticatedUser } from '../../types/auth';
import {
  createClientRegistration,
  findLoginByEmail,
  findValidRefreshToken,
  getAuthenticatedUser,
  revokeRefreshToken,
  storeRefreshToken,
} from './auth.repository';
import {
  createAccessToken,
  createRefreshToken,
  hashRefreshToken,
  verifyRefreshToken,
} from './token.service';

const BCRYPT_ROUNDS = 12;
const DUMMY_PASSWORD_HASH =
  '$2b$12$6QPdgdlvYTAq5IkIQF4qj.VxGIgGE1YW9IAgY7CPuGqtbpDzaJDiy';

async function issueTokens(
  user: AuthenticatedUser,
): Promise<{ accessToken: string; refreshToken: string }> {
  const accessToken = createAccessToken(user);
  const refresh = createRefreshToken(user);
  await storeRefreshToken({
    tokenId: refresh.tokenId,
    tokenHash: hashRefreshToken(refresh.token),
    userId: user.userId,
    accountId: user.accountId,
    resellerId: user.resellerId,
    subResellerId: user.subResellerId,
    clientId: user.clientId,
    expiresAt: refresh.expiresAt,
  });
  return { accessToken, refreshToken: refresh.token };
}

export async function registerClient(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  accountName: string;
}): Promise<{
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}> {
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);
  let registration;
  try {
    registration = await createClientRegistration({ ...input, passwordHash });
  } catch (error) {
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === 'ER_DUP_ENTRY'
    ) {
      throw new AppError(
        409,
        'EMAIL_ALREADY_EXISTS',
        'An account with this email already exists',
      );
    }
    throw error;
  }
  const user = await getAuthenticatedUser(
    registration.userId,
    registration.accountId,
  );
  if (!user)
    throw new AppError(
      500,
      'REGISTRATION_FAILED',
      'Registration could not be completed',
    );
  return { user, ...(await issueTokens(user)) };
}

export async function login(
  email: string,
  password: string,
): Promise<{
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}> {
  const loginRecord = await findLoginByEmail(email);
  const validPassword = loginRecord
    ? await bcrypt.compare(password, loginRecord.password_hash)
    : await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
  if (!loginRecord || !validPassword) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }
  const user = await getAuthenticatedUser(
    loginRecord.user_id,
    loginRecord.account_id,
  );
  if (!user)
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  return { user, ...(await issueTokens(user)) };
}

export async function refreshSession(rawToken: string): Promise<{
  user: AuthenticatedUser;
  accessToken: string;
  refreshToken: string;
}> {
  const claims = verifyRefreshToken(rawToken);
  const isValid = await findValidRefreshToken(
    claims.jti,
    hashRefreshToken(rawToken),
  );
  if (!isValid)
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  const user = await getAuthenticatedUser(claims.sub, claims.accountId);
  if (!user)
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid refresh token');
  await revokeRefreshToken(claims.jti);
  return { user, ...(await issueTokens(user)) };
}

export async function logout(rawToken: string | undefined): Promise<void> {
  if (!rawToken) return;
  try {
    const claims = verifyRefreshToken(rawToken);
    await revokeRefreshToken(claims.jti);
  } catch {
    // Logout remains idempotent and never reveals token validity.
  }
}
