'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, AlertTriangle, Dog, Map, Radio, Wallet, Settings, Users, Building2, Shield } from 'lucide-react';
import type { Profile } from '@/types';

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: Home, roles: ['citizen', 'ngo', 'govt', 'admin', 'hospital'] },
  { href: '/emergency', label: 'Emergency SOS', icon: AlertTriangle, roles: ['citizen', 'ngo', 'govt', 'admin', 'hospital'], highlight: true },
  { href: '/cases', label: 'Cases', icon: Shield, roles: ['citizen', 'ngo', 'govt', 'admin', 'hospital'] },
  { href: '/animals', label: 'Animals', icon: Dog, roles: ['citizen', 'ngo', 'govt', 'admin', 'hospital'] },
  { href: '/map', label: 'Live Map', icon: Map, roles: ['citizen', 'ngo', 'govt', 'admin', 'hospital'] },
  { href: '/dispatch', label: 'Dispatch', icon: Radio, roles: ['ngo', 'govt', 'admin', 'hospital'] },
  { href: '/funding', label: 'Funding', icon: Wallet, roles: ['ngo', 'govt', 'admin', 'hospital'] },
  { href: '/admin/users', label: 'Users', icon: Users, roles: ['admin', 'govt'] },
  { href: '/admin/partners', label: 'Partners', icon: Building2, roles: ['ngo', 'govt', 'admin', 'hospital'] },
];

export default function Sidebar({ user }: { user: Profile | null }) {
  const pathname = usePathname();
  const role = user?.role || 'citizen';

  const visible = navItems.filter((item) => item.roles.includes(role));

  return (
    <aside className="w-64 bg-white border-r border-gray-100 flex flex-col">
      <div className="p-6">
        <h1 className="text-xl font-bold text-astro-clay">Finding Astro</h1>
        <p className="text-xs text-astro-sand mt-1">Animal Welfare Platform</p>
      </div>
      <nav className="flex-1 px-4 space-y-1">
        {visible.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                item.highlight
                  ? 'bg-astro-danger text-white hover:bg-astro-danger/90'
                  : isActive
                  ? 'bg-astro-cream text-astro-clay'
                  : 'text-astro-sand hover:bg-gray-50'
              }`}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 px-4 py-2">
          <div className="w-8 h-8 rounded-full bg-astro-clay text-white flex items-center justify-center text-sm font-bold">
            {user?.full_name?.charAt(0) || user?.phone?.charAt(0) || '?'}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-astro-dark truncate">{user?.full_name || user?.phone || 'Guest'}</p>
            <p className="text-xs text-astro-sand capitalize">{user?.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
