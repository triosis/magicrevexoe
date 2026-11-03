import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';

const apiBaseUrl = import.meta.env.VITE_API_URL;

let accessToken: string | null = null;
let refreshRequest: Promise<string> | null = null;

type RetryableRequest = InternalAxiosRequestConfig & { _retry?: boolean };

const cookieClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 5000,
  withCredentials: true,
  headers: { Accept: 'application/json' },
});

export const apiClient = axios.create({
  baseURL: apiBaseUrl,
  timeout: 5000,
  withCredentials: true,
  headers: {
    Accept: 'application/json',
  },
});

export function setAccessToken(token: string | null): void {
  accessToken = token;
}

async function refreshAccessToken(): Promise<string> {
  if (!refreshRequest) {
    refreshRequest = cookieClient
      .post<{ accessToken: string }>('/auth/refresh')
      .then(({ data }) => {
        setAccessToken(data.accessToken);
        return data.accessToken;
      })
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

apiClient.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

apiClient.interceptors.response.use(undefined, async (error: AxiosError) => {
  const request = error.config as RetryableRequest | undefined;

  if (error.response?.status !== 401 || !request || request._retry) {
    throw error;
  }

  request._retry = true;
  try {
    const token = await refreshAccessToken();
    request.headers.Authorization = `Bearer ${token}`;
    return await apiClient(request);
  } catch (refreshError) {
    setAccessToken(null);
    window.dispatchEvent(new Event('auth:session-expired'));
    throw refreshError;
  }
});

export { cookieClient, refreshAccessToken };
