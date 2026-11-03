import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/login', { replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl shadow-slate-200/60">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Dashboard
        </h1>
        <p className="mt-4 text-slate-600">Signed in as {user?.email}</p>
        <button
          className="mt-8 rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white"
          onClick={() => void handleLogout()}
          type="button"
        >
          Sign out
        </button>
      </section>
    </main>
  );
}
