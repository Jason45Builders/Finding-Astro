"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Cat, FolderHeart, Map, Building,
  User as UserIcon, Bell as BellIcon, LogOut as LogOutIcon,
  Menu as MenuIcon, X as XIcon, AlertTriangle, Heart,
  Search, Leaf, Shield, ShieldAlert, Users, TrendingUp, Bird
} from "lucide-react";
import { useAuth } from "../../lib/auth";
import { api, Notification } from "../../lib/api";

const NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",   icon: LayoutDashboard },
  { label: "Animals",       href: "/animals",      icon: Cat },
  { label: "My Cases",      href: "/cases",        icon: FolderHeart },
  { label: "Respond SOS",   href: "/respond",      icon: AlertTriangle },
  { label: "City Map",      href: "/map",          icon: Map },
  { label: "Adopt",         href: "/adopt",        icon: Heart },
  { label: "Lost & Found",  href: "/lost-found",   icon: Search },
  { label: "Wildlife",      href: "/wildlife",     icon: Bird },
  { label: "Safety",        href: "/safety",       icon: Shield },
  { label: "ABC",           href: "/abc",          icon: Leaf },
  { label: "Funding",       href: "/funding",      icon: Heart },
  { label: "Community",     href: "/community",    icon: Users },
  { label: "Report Cruelty",href: "/cruelty",      icon: ShieldAlert },
  { label: "Impact & CSR",  href: "/impact",       icon: TrendingUp },
  { label: "Partners",      href: "/partners",     icon: Building },
  { label: "My Profile",    href: "/profile",      icon: UserIcon },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchNotifications = async () => {
      try { setNotifications(await api.listNotifications()); } catch { /* ignore */ }
    };
    void fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => { logout(); router.push("/"); };

  const handleNotificationClick = async (id: string) => {
    try {
      await api.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch { /* ignore */ }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (isLoading) return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        <span className="text-sm font-semibold text-slate-500">Loading Finding Astro...</span>
      </div>
    </div>
  );

  if (!user) return null;

  const NavLink = ({ item, onClick }: { item: typeof NAV_ITEMS[0]; onClick?: () => void }) => {
    const active = pathname === item.href || pathname.startsWith(item.href + "/");
    const Icon = item.icon;
    return (
      <Link href={item.href} onClick={onClick}
        className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
          active ? "bg-primary-light text-primary" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
        }`}>
        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-primary" : "text-slate-400"}`} />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-60 bg-white border-r border-slate-200 h-screen sticky top-0">
        <div className="p-5 border-b border-slate-100 shrink-0">
          <Link href="/dashboard" className="text-lg font-black text-primary tracking-tight block">Finding Astro</Link>
          <p className="text-[10px] text-slate-400 mt-0.5 font-semibold uppercase tracking-wider">Chennai Animal Welfare</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => <NavLink key={item.href} item={item} />)}
        </nav>
        <div className="p-3 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs shrink-0">
              {(user.fullName || "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-800 truncate">{user.fullName || "Citizen"}</p>
              <p className="text-[10px] font-semibold text-primary uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
            <LogOutIcon className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Top bar */}
        <header className="bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 sm:px-6 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100">
              <MenuIcon className="w-5 h-5" />
            </button>
            <span className="text-base font-black text-primary md:hidden">Finding Astro</span>
          </div>
          <div className="flex items-center gap-3 relative">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full text-slate-500 hover:bg-slate-100 relative">
              <BellIcon className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-accent text-white text-[9px] font-black rounded-full flex items-center justify-center border border-white">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden z-50">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-800">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="p-1 rounded hover:bg-slate-100">
                    <XIcon className="w-4 h-4 text-slate-500" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length > 0 ? notifications.map(n => (
                    <div key={n.id} onClick={() => void handleNotificationClick(n.id)}
                      className={`p-4 hover:bg-slate-50 cursor-pointer transition-colors ${!n.read ? "bg-emerald-50/50" : ""}`}>
                      <h4 className="text-xs font-bold text-slate-800">{n.title}</h4>
                      <p className="text-xs text-slate-500 mt-1 leading-relaxed">{n.body}</p>
                      <span className="text-[10px] text-slate-400 mt-2 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-xs text-slate-400">No notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 overflow-y-auto">{children}</main>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-72 bg-white h-full shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <span className="text-lg font-black text-primary">Finding Astro</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-lg text-slate-500 hover:bg-slate-100">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {NAV_ITEMS.map(item => <NavLink key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />)}
            </nav>
            <div className="p-3 border-t border-slate-100">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-red-600 hover:bg-red-50 transition-colors">
                <LogOutIcon className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
