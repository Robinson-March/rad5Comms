import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Lock, Mail, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import AuthInput from '../components/auth/AuthInput';
import AuthScaffold from '../components/auth/AuthScaffold';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const ForgotPassword = () => {
  const [step, setStep] = useState<'request' | 'reset'>('request');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const navigate = useNavigate();

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required');
      setIsLoading(false);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/auth/forgot-password`, { email: trimmedEmail });
      toast.success('Reset code sent to your email!');
      setSuccess('Reset code sent to your email. Enter it below to set a new password.');
      setEmail(trimmedEmail);
      setStep('reset');
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to send reset code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    const trimmedEmail = email.trim();
    const trimmedCode = resetCode.trim();

    if (!trimmedCode) {
      setError('Reset code is required');
      setIsLoading(false);
      return;
    }

    if (!newPassword.trim() || newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      await axios.post(`${API_BASE_URL}/auth/reset-password`, {
        email: trimmedEmail,
        code: trimmedCode,
        newPassword,
      });

      setSuccess('Password reset successfully. Redirecting to login...');
      toast.success('Password reset successfully!');
      setTimeout(() => {
        navigate('/');
      }, 1800);
    } catch (err: any) {
      setError(err.response?.data?.error || err.response?.data?.message || 'Failed to reset password. Please check the code and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthScaffold
      eyebrow="Recovery flow"
      sideTitle="Regain access without leaving the March feel behind."
      sideDescription="Use your email reset code, choose a fresh password, and head straight back into the redesigned workspace experience."
    >
      <div className="rounded-[34px] border border-white/80 bg-white/90 p-5 shadow-[0_26px_60px_rgba(148,163,184,0.18)] backdrop-blur sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <button
              onClick={() => navigate('/')}
              className="inline-flex items-center gap-2 rounded-full bg-panel-muted px-3 py-2 text-sm font-medium text-text-secondary transition hover:bg-panel-strong hover:text-text-primary cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to sign in
            </button>
            <h2 className="mt-5 text-3xl font-semibold text-text-primary sm:text-[2rem]">
              {step === 'request' ? 'Forgot password' : 'Reset password'}
            </h2>
            <p className="mt-2 text-sm leading-6 text-text-secondary">
              {step === 'request'
                ? 'Enter the email tied to your workspace account and we will send a reset code.'
                : 'Enter the code from your email and choose a new secure password.'}
            </p>
          </div>

          <div className="hidden rounded-full border border-border bg-panel-muted px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-text-secondary sm:block">
            Secure
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 rounded-full bg-panel-muted p-1 text-sm">
          <div className={`rounded-full px-4 py-2.5 text-center font-medium ${step === 'request' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            1. Request code
          </div>
          <div className={`rounded-full px-4 py-2.5 text-center font-medium ${step === 'reset' ? 'bg-white text-text-primary shadow-sm' : 'text-text-secondary'}`}>
            2. Reset password
          </div>
        </div>

        <form onSubmit={step === 'request' ? handleRequestReset : handleResetPassword} className="mt-6 space-y-4">
          {error ? (
            <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
          ) : null}

          {success ? (
            <div className="rounded-[22px] border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>
          ) : null}

          <AuthInput
            icon={Mail}
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={step === 'reset'}
            autoComplete="email"
            required
          />

          {step === 'reset' ? (
            <>
              <AuthInput
                icon={ShieldCheck}
                type="text"
                placeholder="Reset code"
                value={resetCode}
                onChange={(e) => setResetCode(e.target.value)}
                required
              />

              <AuthInput
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="New password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
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

              <AuthInput
                icon={KeyRound}
                type={showPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </>
          ) : null}

          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex w-full items-center justify-center gap-2 rounded-[22px] bg-gradient-to-r from-blue to-blue-dark px-5 py-3.5 text-base font-semibold text-white shadow-[0_18px_34px_rgba(37,99,235,0.24)] transition hover:translate-y-[-1px] disabled:cursor-not-allowed disabled:opacity-70 cursor-pointer"
          >
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : null}
            {isLoading
              ? step === 'request'
                ? 'Sending reset code...'
                : 'Resetting password...'
              : step === 'request'
                ? 'Send reset code'
                : 'Reset password'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Remember your password?{' '}
          <button
            type="button"
            onClick={() => navigate('/')}
            className="font-semibold text-blue transition hover:opacity-80 cursor-pointer"
          >
            Sign in
          </button>
        </p>
      </div>
    </AuthScaffold>
  );
};

export default ForgotPassword;
