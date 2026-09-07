'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, AlertCircle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { LogoMark } from '@/components/ui/Logo';
import { api } from '@/lib/api';

function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await api.requestPasswordReset(email);
      setSent(true);
    } catch (err: any) {
      setError(err?.message || 'Failed to request password reset');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-8 shadow-xl text-center space-y-4">
          <LogoMark className="w-12 h-12 mx-auto mb-2" />
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary">Check your email</h1>
          <p className="text-sm text-on-surface-variant">If an account exists with this email, we sent a password reset link.</p>
          <Button variant="primary" onClick={() => router.push('/auth/login')} className="w-full">Back to login</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <LogoMark className="w-12 h-12 mx-auto mb-4" />
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2">Reset password</h1>
          <p className="text-on-surface-variant text-sm">Enter your email and we’ll send a reset link.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label>Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="pl-10"
              />
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-error text-sm bg-error-container p-3 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
            {loading ? 'Sending...' : 'Send reset link'}
          </Button>
        </form>
        <p className="text-center text-sm text-on-surface-variant mt-6">
          Remember your password? <a href="/auth/login" className="text-primary font-bold hover:underline">Sign in</a>
        </p>
      </Card>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
