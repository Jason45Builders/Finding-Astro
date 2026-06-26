import { createClient } from '@/lib/supabase/client';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { KeyRound } from 'lucide-react';

export default function VerifyPage() {
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const searchParams = useSearchParams();
  const phone = searchParams.get('phone') || '';
  const supabase = createClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const cleanPhone = phone.startsWith('+') ? phone : '+91' + phone;
    const { error } = await supabase.auth.verifyOtp({ phone: cleanPhone, token: otp, type: 'sms' });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/dashboard');
    router.refresh();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-astro-cream p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-astro-dark mb-2">Verify OTP</h1>
          <p className="text-astro-sand">Enter the code sent to {phone}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-astro-dark mb-1">OTP Code</label>
            <div className="relative">
              <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-astro-sand" />
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-astro-clay focus:ring-2 focus:ring-astro-clay/20 outline-none transition text-center tracking-[0.5em] font-mono text-lg"
              />
            </div>
          </div>
          {error && <p className="text-astro-danger text-sm">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-astro-clay text-white py-3 rounded-xl font-semibold hover:bg-astro-clay/90 disabled:opacity-50 transition"
          >
            {loading ? 'Verifying...' : 'Verify & Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
