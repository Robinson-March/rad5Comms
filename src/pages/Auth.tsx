import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff, Loader2, Lock, Mail, User } from 'lucide-react';
import { toast } from 'sonner';
import AuthScaffold from '../components/auth/AuthScaffold';
import AuthInput from '../components/auth/AuthInput';

type AuthMode = 'login' | 'signup';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Auth = () => {
  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (!token) {
      setIsCheckingSession(false);
      return;
    }

    axios
      .get(`${API_BASE_URL}/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then(() => {
        navigate('/home');
      })
      .catch(() => {
        localStorage.removeItem('token');
        setIsCheckingSession(false);
      });
  }, [navigate]);

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const trimmedEmail = email.trim();
    const trimmedName = name.trim();

    if (!trimmedEmail) {
      setError('Email is required');
      setIsSubmitting(false);
      return;
    }

    if (!password.trim() || password.length < 6) {
      setError('Password must be at least 6 characters');
      setIsSubmitting(false);
      return;
    }

    if (mode === 'signup' && !trimmedName) {
      setError('Full name is required');
      setIsSubmitting(false);
      return;
    }

    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/signup';
      const payload = mode === 'login' ? { email: trimmedEmail, password } : { name: trimmedName, email: trimmedEmail, password };

      const response = await axios.post(`${API_BASE_URL}${endpoint}`, payload);
      const token = response.data?.token || response.data?.data?.token;

      if (!token) {
        throw new Error('Missing token in response');
      }

      localStorage.setItem('token', token);
      window.dispatchEvent(new Event('auth-change'));
      toast.success(mode === 'login' ? 'Logged in successfully!' : 'Account created! Welcome!');
      navigate('/home');
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'An error occurred. Please try again.';
      toast.error(errorMsg, { duration: 5000 });
      setError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="March UI"
      sideTitle="A cleaner way back into your workspace."
      sideDescription="Sign in or create your account inside the same refined system your team already uses for channels, DMs, and live collaboration."
    >
      <div className="rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-[0_26px_60px_rgba(148,163,184,0.18)] backdrop-blur sm:p-7">
        {isCheckingSession ? (
          <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-soft text-blue">
              <Loader2 className="h-7 w-7 animate-spin" />
            </div>
            <h2 className="mt-6 text-2xl font-semibold text-text-primary">Checking your session</h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-text-secondary">
              We’re making sure your last workspace session is still active before showing the auth form.
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex rounded-full bg-blue-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-blue">
                  Workspace access
                </div>
                <h2 className="mt-4 text-3xl font-semibold text-text-primary sm:text-[2rem]">
                  {mode === 'login' ? 'Sign in' : 'Create account'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-text-secondary">
                  {mode === 'login'
                    ? 'Access your team conversations and continue where you left off.'
                    : 'Join your workspace with the same March experience as the main app.'}
                </p>
              </div>

              <div className="hidden rounded-full border border-border bg-panel-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary sm:block">
                Rad5
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 rounded-full bg-panel-muted p-1">
              <button
                type="button"
                onClick={() => switchMode('login')}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
                  mode === 'login' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => switchMode('signup')}
                className={`rounded-full px-4 py-2.5 text-sm font-medium transition cursor-pointer ${
                  mode === 'signup' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary hover:text-text-primary'
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              {error ? (
                <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              {mode === 'signup' ? (
                <AuthInput
                  icon={User}
                  type="text"
                  placeholder="Full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                />
              ) : null}

              <AuthInput
                icon={Mail}
                type="email"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <AuthInput
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="text-text-secondary transition hover:text-text-primary cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                }
              />

              {mode === 'login' ? (
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-sm font-medium text-blue transition hover:opacity-80">
                    Forgot password?
                  </Link>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-blue to-blue-dark px-5 py-3.5 text-base font-semibold text-white shadow-[0_18px_34px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
                {isSubmitting
                  ? mode === 'login'
                    ? 'Signing in...'
                    : 'Creating account...'
                  : mode === 'login'
                    ? 'Sign in'
                    : 'Create account'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-text-secondary">
              {mode === 'login' ? "Don't have an account? " : 'Already have an account? '}
              <button
                type="button"
                onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
                className="font-semibold text-blue transition hover:opacity-80 cursor-pointer"
              >
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </>
        )}
      </div>
    </AuthScaffold>
  );
};

export default Auth;
