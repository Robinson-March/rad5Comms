import { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import AuthInput from '../components/auth/AuthInput';
import AuthScaffold from '../components/auth/AuthScaffold';
import { useAuthSession } from '../context/AuthSessionContext';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

interface ChangePasswordLocationState {
  currentPassword?: string;
  mustChangePassword?: boolean;
}

const ChangePassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { token, mustChangePassword, updateUser } = useAuthSession();
  const state = (location.state || {}) as ChangePasswordLocationState;

  const [currentPassword, setCurrentPassword] = useState(state.currentPassword || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isForcedFlow = useMemo(
    () => mustChangePassword || Boolean(state.mustChangePassword),
    [mustChangePassword, state.mustChangePassword]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!token) {
      navigate('/');
      return;
    }

    if (!currentPassword.trim()) {
      setError('Current password is required');
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword === currentPassword) {
      setError('New password must be different from your current password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsSubmitting(true);

    try {
      await axios.post(
        `${API_BASE_URL}/auth/change-password`,
        { currentPassword, newPassword },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      updateUser({ mustChangePassword: false });
      toast.success('Password changed successfully');
      navigate('/home', { replace: true });
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const message = err.response?.data?.error || err.response?.data?.message || 'Failed to change password';
        setError(message);
        toast.error(message);
      } else {
        setError('Failed to change password');
        toast.error('Failed to change password');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Password update"
      sideTitle="Secure your workspace access before continuing."
      sideDescription="This password change happens inside your signed-in session, so you can get back to chat immediately once it is complete."
    >
      <div className="rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-[0_26px_60px_rgba(148,163,184,0.18)] backdrop-blur sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            {!isForcedFlow ? (
              <button
                onClick={() => navigate('/home')}
                className="inline-flex items-center gap-2 rounded-full bg-panel-muted px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-panel-strong hover:text-text-primary cursor-pointer"
                type="button"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to workspace
              </button>
            ) : null}

            <h2 className="mt-5 text-3xl font-semibold text-text-primary sm:text-[2rem]">Change password</h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {isForcedFlow
                ? 'Your account requires a password update before you can continue into the workspace.'
                : 'Update your password for stronger access control across the workspace.'}
            </p>
          </div>

          <div className="hidden rounded-full border border-border bg-panel-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary sm:block">
            Secure
          </div>
        </div>

        {isForcedFlow ? (
          <div className="mt-6 flex items-start gap-3 rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
            <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>Your admin requires a one-time password update before you return to messages and channels.</p>
          </div>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          <AuthInput
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            placeholder="Current password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            autoComplete="current-password"
            required
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((previous) => !previous)}
                className="text-text-secondary transition hover:text-text-primary cursor-pointer"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            }
          />

          <AuthInput
            icon={KeyRound}
            type={showPassword ? 'text' : 'password'}
            placeholder="New password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoComplete="new-password"
            required
          />

          <AuthInput
            icon={KeyRound}
            type={showPassword ? 'text' : 'password'}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            required
          />

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-blue to-blue-dark px-5 py-3.5 text-base font-semibold text-white shadow-[0_18px_34px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {isSubmitting ? 'Updating password...' : 'Update password'}
          </button>
        </form>
      </div>
    </AuthScaffold>
  );
};

export default ChangePassword;
