import { useQuery } from '@tanstack/react-query';
import { Navigate, Route, Routes } from 'react-router-dom';
import { apiClient } from './api/client';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

type HealthResponse = {
  success: boolean;
  service: string;
};

async function fetchHealth(): Promise<HealthResponse> {
  const response = await apiClient.get<HealthResponse>('/health');
  return response.data;
}

function HealthPage() {
  const healthQuery = useQuery({
    queryKey: ['health'],
    queryFn: fetchHealth,
    retry: 1,
  });

  const isConnected = healthQuery.isSuccess && healthQuery.data.success;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <section className="w-full max-w-lg rounded-2xl bg-white p-10 text-center shadow-xl shadow-slate-200/60">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900">
          MagicReview AI
        </h1>
        <div className="mt-8 rounded-xl bg-slate-50 p-5">
          <p className="text-sm font-medium uppercase tracking-wider text-slate-500">
            API Connection
          </p>
          <p
            className={`mt-2 text-xl font-semibold ${isConnected ? 'text-emerald-600' : 'text-rose-600'}`}
            aria-live="polite"
          >
            {isConnected ? 'Connected' : 'Disconnected'}
          </p>
        </div>
      </section>
    </main>
  );
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<HealthPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
