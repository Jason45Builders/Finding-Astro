'use client';

import { useAuth } from '@/components/AuthProvider';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-astro-cream">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-astro-clay" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-astro-cream">
      <Sidebar user={user} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar user={user} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
