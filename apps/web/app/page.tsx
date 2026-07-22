import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { PawPrint, Siren, MapPinned } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';

export default async function RootPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get('fa_token')?.value;

  if (token) {
    redirect('/dashboard');
  }

  const features = [
    {
      icon: PawPrint,
      title: 'Track Animals',
      description: 'Monitor community animals, lost pets, and adoption status',
    },
    {
      icon: Siren,
      title: 'Emergency Response',
      description: 'Report injured animals and dispatch volunteer responders',
    },
    {
      icon: MapPinned,
      title: 'City Map',
      description: 'Visualize animals, cases, clinics, and ABC centres',
    },
  ];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-8 animate-stagger">
        <div className="space-y-4">
          <h1 className="font-display-lg text-4xl sm:text-display-lg text-primary tracking-tight">Finding Astro</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Civic animal welfare platform — Tambaram, Chennai</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/auth/login"><Button variant="coral" size="lg" className="w-full sm:w-auto">Sign In</Button></a>
          <a href="/auth/signup"><Button variant="outline" size="lg" className="w-full sm:w-auto">Create Account</Button></a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
          {features.map((f) => (
            <Card key={f.title} className="p-6 text-left">
              <div className="w-11 h-11 rounded-md bg-primary-container text-on-primary-container flex items-center justify-center mb-3">
                <f.icon className="w-5 h-5" />
              </div>
              <h3 className="font-title-md text-sm text-on-surface">{f.title}</h3>
              <p className="text-sm text-on-surface-variant mt-1">{f.description}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
