'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Mail, Lock, Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Input, Label } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { signup } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signup(email, password, fullName);
      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-8 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="font-headline-lg-mobile text-headline-lg-mobile text-primary mb-2">Create account</h1>
          <p className="text-on-surface-variant text-sm">Join the Finding Astro community</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Full Name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <Input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your name"
                required
                className="pl-10"
              />
            </div>
          </div>
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
          <div>
            <Label>Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
              <Input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Min. 6 characters"
                required
                minLength={6}
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
          {error && (
            <div className="flex items-center gap-2 text-error text-sm bg-error-container p-3 rounded-md">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}
          <Button type="submit" disabled={loading} variant="primary" size="lg" className="w-full">
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
        <p className="text-center text-sm text-on-surface-variant mt-6">
          Already have an account? <a href="/auth/login" className="text-primary font-bold hover:underline">Sign in</a>
        </p>
      </Card>
    </div>
  );
}
