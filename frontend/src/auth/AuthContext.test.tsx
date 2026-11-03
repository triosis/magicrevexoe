import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import * as authService from '../api/auth.service';
import { AuthProvider, useAuth } from './AuthContext';
import { ProtectedRoute } from './ProtectedRoute';

vi.mock('../api/auth.service', async (importOriginal) => {
  const actual = await importOriginal<typeof authService>();
  return {
    ...actual,
    login: vi.fn(),
    logout: vi.fn(),
    restoreSession: vi.fn(),
  };
});

const user: authService.AuthUser = {
  id: 'user-1',
  email: 'owner@example.com',
  accountId: 'account-1',
  accountType: 'client',
  role: 'owner',
  permissions: [],
  tenant: { resellerId: null, subResellerId: null, clientId: 'client-1' },
};

function AuthHarness() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="status">{auth.status}</span>
      <span data-testid="email">{auth.user?.email}</span>
      <span data-testid="error">{auth.error}</span>
      <button
        onClick={() =>
          void auth
            .login({ email: 'owner@example.com', password: 'password' })
            .catch(() => undefined)
        }
      >
        login
      </button>
      <button onClick={() => void auth.logout()}>logout</button>
    </div>
  );
}

function renderAuth(ui = <AuthHarness />) {
  return render(
    <MemoryRouter>
      <AuthProvider>{ui}</AuthProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(authService.restoreSession).mockRejectedValue(
    new Error('No session'),
  );
});

describe('authentication', () => {
  it('handles login success', async () => {
    vi.mocked(authService.login).mockResolvedValue(user);
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    );
    fireEvent.click(screen.getByText('login'));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    expect(screen.getByTestId('email')).toHaveTextContent(user.email);
  });

  it('handles login failure', async () => {
    vi.mocked(authService.login).mockRejectedValue(
      new Error('Invalid email or password'),
    );
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    );
    fireEvent.click(screen.getByText('login'));
    await waitFor(() =>
      expect(screen.getByTestId('error')).toHaveTextContent(
        'Invalid email or password',
      ),
    );
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });

  it('restores the current session', async () => {
    vi.mocked(authService.restoreSession).mockResolvedValue(user);
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    expect(screen.getByTestId('email')).toHaveTextContent(user.email);
  });

  it('logs out and clears the session', async () => {
    vi.mocked(authService.restoreSession).mockResolvedValue(user);
    vi.mocked(authService.logout).mockResolvedValue();
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    fireEvent.click(screen.getByText('logout'));
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated'),
    );
    expect(authService.logout).toHaveBeenCalledOnce();
  });

  it('redirects an unauthenticated user away from a protected route', async () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<div>Login page</div>} />
            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<div>Private dashboard</div>} />
            </Route>
          </Routes>
        </AuthProvider>
      </MemoryRouter>,
    );
    expect(screen.getByText('Loading session…')).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByText('Login page')).toBeInTheDocument(),
    );
    expect(screen.queryByText('Private dashboard')).not.toBeInTheDocument();
  });

  it('clears an expired session event', async () => {
    vi.mocked(authService.restoreSession).mockResolvedValue(user);
    renderAuth();
    await waitFor(() =>
      expect(screen.getByTestId('status')).toHaveTextContent('authenticated'),
    );
    act(() => window.dispatchEvent(new Event('auth:session-expired')));
    expect(screen.getByTestId('status')).toHaveTextContent('unauthenticated');
  });
});
