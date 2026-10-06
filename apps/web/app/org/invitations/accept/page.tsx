'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, User, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { PageSpinner } from '@/components/ui/Spinner';
import { LogoMark } from '@/components/ui/Logo';

function InvitationForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setError('This invitation link is missing its invitation token.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? '/api/v1';
      const response = await fetch(
        `${baseUrl}/org/invitations/accept?token=${encodeURIComponent(token)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'Finding-Astro-App' },
          body: JSON.stringify({ fullName, password }),
        }
      );

      const payload = await response.json().catch(() => null);
      if (!response.ok || payload?.success === false) {
        throw new Error(payload?.message || 'Unable to accept this invitation');
      }

      setAccepted(true);
    } catch (err: any) {
      setError(err?.message || 'Unable to accept this invitation');
    } finally {
      setLoading(false);
    }
  };

  if (accepted) {
    return (
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center">
          <CheckCircle2 className="w-12 h-12 mx-auto mb-4 text-success" />
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2">Invitation accepted</h1>
          <p className="text-on-surface-variant text-sm">
            Your organization membership is active. Sign in to continue to the NGO workspace.
          </p>
          <Button
            type="button"
            variant="primary"
            size="lg"
            className="w-full mt-6"
            onClick={() => router.push('/auth/login?next=%2Forg%2Fdashboard')}
          >
            Continue to Sign In
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-8 shadow-xl">
      <div className="text-center mb-8">
        <LogoMark className="w-12 h-12 mx-auto mb-4" />
        <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2">Join your NGO team</h1>
        <p className="text-on-surface-variant text-sm">
          You have been invited to join an organization on Finding Astro.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>Full name</Label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Your name"
              className="pl-10"
            />
          </div>
        </div>

        <div>
          <Label>Password <span className="text-xs font-normal text-on-surface-variant">(only needed for a new account)</span></Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 10 characters for a new account"
              className="pl-10"
            />
          </div>
        </div>

        {error && (
          <div className="flex items-start gap-2 text-error text-sm bg-error-container p-3 rounded-md">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <Button type="submit" disabled={loading || !token} variant="primary" size="lg" className="w-full">
          {loading ? 'Accepting invitation...' : 'Accept Invitation'}
        </Button>
      </form>

      <p className="text-center text-xs text-on-surface-variant mt-6">
        This invitation is single-use and expires after 7 days.
      </p>
    </Card>
  );
}

export default function InvitationPage() {
  return (
    <Suspense fallback={<PageSpinner />}>
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <InvitationForm />
      </div>
    </Suspense>
  );
}
