'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { LogoMark } from '@/components/ui/Logo';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams?.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) setError('Missing reset token');
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (password !== confirmPassword) {
        setError('Passwords do not match');
        setLoading(false);
        return;
      }
      await api.resetPassword(token, password);
      setSuccess(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 shadow-xl text-center space-y-4">
          <CheckCircle className="w-12 h-12 mx-auto text-green-600" />
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">Password updated</h1>
          <p className="text-sm text-on-surface-variant">You can now sign in with your new password.</p>
          <Button variant="primary" onClick={() => router.push('/auth/login')} className="w-full">Sign in</Button>
        </Card>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 shadow-xl text-center space-y-4">
          <AlertCircle className="w-12 h-12 mx-auto text-error" />
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-on-surface">Invalid reset link</h1>
          <p className="text-sm text-on-surface-variant">This password reset link is missing or invalid.</p>
          <Button variant="primary" onClick={() => router.push('/auth/forgot-password')} className="w-full">Request new link</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <LogoMark className="w-12 h-12 mx-auto mb-4" />
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2">Choose a new password</h1>
          <p className="text-on-surface-variant text-sm">Use at least 8 characters, including upper and lower case letters and a number.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>New password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 8 characters"
                required
                minLength={8}
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label>Confirm new password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repeat password"
                required
                minLength={8}
                className="pl-10 pr-10"
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-error text-sm bg-error-container p-3 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading || !token} variant="primary" size="lg" className="w-full">
            {loading ? 'Updating...' : 'Update password'}
          </Button>
        </form>
      </Card>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
