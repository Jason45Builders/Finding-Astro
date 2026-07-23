"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  LayoutDashboard, Cat, FolderHeart, Map, Building,
  User as UserIcon, Bell as BellIcon, LogOut as LogOutIcon,
  Menu as MenuIcon, X as XIcon, AlertTriangle, Heart,
  Search, Leaf, Shield, ShieldAlert, Users, TrendingUp, Bird,
  Radio, Users as UsersIcon, ClipboardList, DollarSign, UserCheck,
  MoreHorizontal, Store
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, Notification } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageSpinner } from "@/components/ui/Spinner";

const BASE_NAV_ITEMS = [
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

const ADMIN_NAV_ITEMS = [
  { label: "Dispatch",           href: "/dispatch",               icon: Radio },
  { label: "Verifications",      href: "/admin/verifications",     icon: UserCheck },
  { label: "Reimbursements",     href: "/admin/reimbursements",    icon: DollarSign },
  { label: "Case Oversight",     href: "/admin/cases",             icon: ClipboardList },
  { label: "Partner Requests",   href: "/admin/partner-requests",  icon: Store },
  { label: "Users",              href: "/admin/users",             icon: UsersIcon },
];

const MOBILE_PRIMARY_ITEMS = [
  { label: "Home",   href: "/dashboard", icon: LayoutDashboard },
  { label: "Cases",  href: "/cases",     icon: FolderHeart },
  { label: "Map",    href: "/map",       icon: Map },
  { label: "Profile",href: "/profile",   icon: UserIcon },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading, bootstrap } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "govt";
  const navItems = isStaff ? [...BASE_NAV_ITEMS, ...ADMIN_NAV_ITEMS] : BASE_NAV_ITEMS;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  if (isLoading) return <div className="min-h-screen bg-background flex items-center justify-center"><PageSpinner label="Loading Finding Astro..." /></div>;

  if (!user) return null;

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const NavLink = ({ item, onClick }: { item: { label: string; href: string; icon: React.ElementType }; onClick?: () => void }) => {
    const active = isActive(item.href);
    const Icon = item.icon;
    return (
      <Link href={item.href} onClick={onClick}
        className={cn(
          "flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-bold transition-colors duration-150 ease-out border-r-4",
          active
            ? "bg-surface-container-highest text-primary border-primary"
            : "text-on-surface-variant hover:bg-surface-container border-transparent"
        )}
      >
        <Icon className={cn("w-4 h-4 shrink-0", active ? "text-primary" : "text-outline")} />
        {item.label}
      </Link>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-surface-container-low border-r border-outline-variant h-screen sticky top-0">
        <div className="p-5 border-b border-outline-variant shrink-0">
          <Link href="/dashboard" className="font-display-lg text-2xl font-extrabold text-primary tracking-tight block leading-none">Finding Astro</Link>
          <p className="font-label-caps text-label-caps text-secondary mt-1.5 uppercase">Civic Animal Welfare</p>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map(item => <NavLink key={item.href} item={item} />)}
        </nav>
        <div className="p-3 border-t border-outline-variant shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2 py-2 bg-surface-container rounded-md">
            <div className="w-9 h-9 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-xs shrink-0">
              {(user.fullName || "A").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-on-surface truncate">{user.fullName || "Citizen"}</p>
              <p className="font-label-caps text-[10px] text-on-surface-variant uppercase tracking-wider">{user.role}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 rounded-md text-sm font-bold text-error hover:bg-error-container/50 transition-colors duration-150 ease-out">
            <LogOutIcon className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto pb-20 md:pb-0">
        {/* Top bar */}
        <header className="bg-surface border-b-2 border-outline-variant h-16 flex items-center justify-between px-4 sm:px-gutter z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <MenuIcon className="w-5 h-5" />
            </button>
            <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary md:hidden">Finding Astro</span>
          </div>
          <div className="flex items-center gap-3 relative">
            <button onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-full text-on-surface-variant hover:bg-surface-container-high transition-colors duration-150 ease-out active:scale-95 relative">
              <BellIcon className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-secondary text-on-secondary text-[9px] font-black rounded-full flex items-center justify-center border border-surface">
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="absolute right-0 top-12 w-80 bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl overflow-hidden z-50 origin-top-right animate-fade-up">
                <div className="p-4 border-b border-outline-variant flex items-center justify-between">
                  <h3 className="font-title-md text-sm text-on-surface">Notifications</h3>
                  <button onClick={() => setShowNotifications(false)} className="p-1 rounded hover:bg-surface-container-high">
                    <XIcon className="w-4 h-4 text-on-surface-variant" />
                  </button>
                </div>
                <div className="max-h-72 overflow-y-auto divide-y divide-outline-variant/50">
                  {notifications.length > 0 ? notifications.map(n => (
                    <div key={n.id} onClick={() => void handleNotificationClick(n.id)}
                      className={cn("p-4 hover:bg-surface-container cursor-pointer transition-colors", !n.read && "bg-primary-container/10")}>
                      <h4 className="text-xs font-bold text-on-surface">{n.title}</h4>
                      <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{n.body}</p>
                      <span className="text-[10px] text-outline mt-2 block">{new Date(n.createdAt).toLocaleDateString()}</span>
                    </div>
                  )) : (
                    <div className="p-8 text-center text-xs text-outline">No notifications</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-gutter">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center px-2 py-2.5 bg-surface border-t border-outline-variant shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {MOBILE_PRIMARY_ITEMS.map(item => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex flex-col items-center justify-center gap-0.5 rounded-full px-4 py-1 transition-transform duration-150 ease-out active:scale-90",
                active ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant"
              )}
            >
              <Icon className="w-5 h-5" />
              <span className="font-label-caps text-[10px]">{item.label}</span>
            </Link>
          );
        })}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center gap-0.5 rounded-full px-4 py-1 text-on-surface-variant transition-transform duration-150 ease-out active:scale-90"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="font-label-caps text-[10px]">More</span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-200 ease-out" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-72 bg-surface-container-lowest h-full shadow-2xl transition-transform duration-200 ease-out">
            <div className="flex items-center justify-between p-5 border-b border-outline-variant">
              <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary">Finding Astro</span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-high">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {navItems.map(item => <NavLink key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />)}
            </nav>
            <div className="p-3 border-t border-outline-variant">
              <button onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-md text-sm font-bold text-error hover:bg-error-container/50 transition-colors duration-150 ease-out">
                <LogOutIcon className="w-4 h-4" /> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
