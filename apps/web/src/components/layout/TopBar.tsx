'use client';

import { useAuth } from '@/components/AuthProvider';
import { LogOut, Bell } from 'lucide-react';
import type { Profile } from '@/types';

export default function TopBar({ user }: { user: Profile | null }) {
  const { signOut } = useAuth();

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6">
      <div>
        <h2 className="text-lg font-semibold text-astro-dark">Welcome back, {user?.full_name?.split(' ')[0] || 'Responder'}</h2>
      </div>
      <div className="flex items-center gap-4">
        <button className="relative p-2 text-astro-sand hover:text-astro-dark transition">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-astro-danger rounded-full" />
        </button>
        <button
          onClick={signOut}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-astro-sand hover:text-astro-dark hover:bg-gray-50 rounded-xl transition"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>
    </header>
  );
}
