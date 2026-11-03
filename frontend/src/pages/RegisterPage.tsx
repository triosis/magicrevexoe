import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export function RegisterPage() {
  const { register, status, error, clearError } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearError();
    setSubmitting(true);
    const form = new FormData(event.currentTarget);
    try {
      await register({
        email: String(form.get('email')),
        password: String(form.get('password')),
        firstName: String(form.get('firstName')),
        lastName: String(form.get('lastName')),
        accountName: String(form.get('accountName')),
      });
      navigate('/dashboard', { replace: true });
    } catch {
      // AuthContext exposes the API error to the form.
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass = 'mt-2 w-full rounded-lg border border-slate-300 p-3';
  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-10">
      <section className="w-full max-w-lg rounded-2xl bg-white p-10 shadow-xl shadow-slate-200/60">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Create your account
        </h1>
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium text-slate-700">
            First name
            <input className={inputClass} name="firstName" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Last name
            <input className={inputClass} name="lastName" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Account name
            <input className={inputClass} name="accountName" required />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Email
            <input
              className={inputClass}
              name="email"
              type="email"
              required
              autoComplete="email"
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Password
            <input
              className={inputClass}
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
            />
          </label>
          {error && (
            <p className="text-sm text-rose-600" role="alert">
              {error}
            </p>
          )}
          <button
            className="w-full rounded-lg bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-60"
            disabled={submitting}
            type="submit"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-600">
          Already registered?{' '}
          <Link className="font-semibold text-slate-900" to="/login">
            Sign in
          </Link>
        </p>
      </section>
    </main>
  );
}
