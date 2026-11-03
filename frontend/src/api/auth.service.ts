import axios from 'axios';
import {
  apiClient,
  cookieClient,
  refreshAccessToken,
  setAccessToken,
} from './client';

export type AuthUser = {
  id: string;
  email: string;
  accountId: string;
  accountType: string;
  role: string;
  permissions: string[];
  tenant: {
    resellerId: string | null;
    subResellerId: string | null;
    clientId: string | null;
  };
};

type AuthResponse = {
  success: true;
  accessToken: string;
  user: AuthUser;
};

export type LoginInput = { email: string; password: string };

export type RegisterInput = LoginInput & {
  firstName: string;
  lastName: string;
  accountName: string;
};

function acceptSession(data: AuthResponse): AuthUser {
  setAccessToken(data.accessToken);
  return data.user;
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { data } = await cookieClient.post<AuthResponse>('/auth/login', input);
  return acceptSession(data);
}

export async function register(input: RegisterInput): Promise<AuthUser> {
  const { data } = await cookieClient.post<AuthResponse>(
    '/auth/register',
    input,
  );
  return acceptSession(data);
}

export async function restoreSession(): Promise<AuthUser> {
  await refreshAccessToken();
  const { data } = await apiClient.get<{ success: true; user: AuthUser }>(
    '/auth/me',
  );
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiClient.post('/auth/logout');
  } finally {
    setAccessToken(null);
  }
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? 'Unable to reach the server';
  }
  return error instanceof Error ? error.message : 'Something went wrong';
}
