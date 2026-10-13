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
  MoreHorizontal, Store, MessageSquare, Ambulance,
  PawPrint, Calendar, Activity,
  Home as HomeIcon, CheckCircle2, Settings, HeartHandshake,
  Stethoscope, FileCheck2, BookOpen
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { api, Notification } from "@/lib/api";
import { cn } from "@/lib/utils";
import { PageSpinner } from "@/components/ui/Spinner";
import { Logo, LogoMark } from "@/components/ui/Logo";

const BASE_NAV_ITEMS = [
  { label: "Dashboard",     href: "/dashboard",   icon: LayoutDashboard },
  { label: "Animals",       href: "/animals",      icon: Cat },
  { label: "My Cases",      href: "/cases",        icon: FolderHeart },
  { label: "Respond SOS",   href: "/respond",      icon: AlertTriangle },
  { label: "City Map",      href: "/map",          icon: Map },
  { label: "Adopt",         href: "/adopt",        icon: Heart },
  { label: "Foster",        href: "/foster",       icon: Heart },
  { label: "Lost & Found",  href: "/lost-found",   icon: Search },
  { label: "Wildlife",      href: "/wildlife",     icon: Bird },
  { label: "Safety",        href: "/safety",       icon: Shield },
  { label: "ABC",           href: "/abc",          icon: Leaf },
  { label: "Funding",       href: "/funding",      icon: Heart },
  { label: "My Donations",  href: "/my/donations", icon: Heart },
  { label: "Community",     href: "/community",    icon: Users },
  { label: "My Collectives", href: "/collectives",  icon: HeartHandshake },
  { label: "Memorial Wall", href: "/memorials",    icon: Heart },
  { label: "Pawprints & Memories", href: "/community-stories", icon: PawPrint },
  { label: "Report Cruelty",href: "/cruelty",      icon: ShieldAlert },
  { label: "Partners",      href: "/partners",     icon: Building },
  { label: "Feedback",       href: "/beta/feedback", icon: MessageSquare },
  { label: "Ambulance",      href: "/ambulance",      icon: Ambulance },
  { label: "My Profile",    href: "/profile",      icon: UserIcon },
  { label: "Legal",         href: "/legal",        icon: ShieldAlert },
  { label: "Privacy",       href: "/privacy",      icon: Shield },
  { label: "Terms",         href: "/terms",        icon: ClipboardList },
];

const ADMIN_NAV_ITEMS = [
  { label: "Dashboard",              href: "/dashboard",               icon: LayoutDashboard },
  { label: "Case Oversight",         href: "/admin/cases",              icon: ClipboardList },
  { label: "City Map",               href: "/map",                      icon: Map },
  { label: "Cruelty Reports",        href: "/cruelty",                  icon: ShieldAlert },
  { label: "SOS & Emergency Cases",  href: "/respond",                  icon: AlertTriangle },
  { label: "Animals",                href: "/animals",                  icon: Cat },
  { label: "Ambulance Dispatch",     href: "/dispatch",                 icon: Radio },
  { label: "Adoption Review",        href: "/adoption-admin",           icon: Heart },
  { label: "Rehome Review",          href: "/rehome/review",             icon: PawPrint },
  { label: "Verifications",          href: "/admin/verifications",      icon: UserCheck },
  { label: "Reimbursements",         href: "/admin/reimbursements",     icon: DollarSign },
  { label: "Partner Requests",       href: "/admin/partner-requests",   icon: Store },
  { label: "Ambulance Management",   href: "/admin/ambulance",          icon: Ambulance },
  { label: "Memorial Wall",          href: "/admin/memorials",          icon: Heart },
  { label: "Pawprints & Memories",   href: "/admin/community-stories",  icon: PawPrint },
  { label: "Funding & Donations",    href: "/funding",                  icon: HeartHandshake },
  { label: "Impact & CSR",           href: "/impact",                   icon: TrendingUp },
  { label: "Feedback",               href: "/admin/beta/feedback",      icon: MessageSquare },
  { label: "Users & Roles",          href: "/admin/users",              icon: UsersIcon },
  { label: "Library",                href: "/admin/library",            icon: BookOpen },
  { label: "My Profile",             href: "/profile",                  icon: UserIcon },
  { label: "Legal",                  href: "/legal",                    icon: ShieldAlert },
  { label: "Privacy",                href: "/privacy",                  icon: Shield },
  { label: "Terms",                 href: "/terms",                    icon: ClipboardList },
];

const ORG_NAV_ITEMS = [
  { label: "Dashboard",  href: "/org/dashboard", icon: LayoutDashboard },
  { label: "Animals",    href: "/org/animals",   icon: Cat },
  { label: "Volunteers", href: "/org/volunteers",icon: Users },
  { label: "Tasks",      href: "/org/tasks",     icon: ClipboardList },
  { label: "Events",     href: "/org/events",    icon: Calendar },
  { label: "Expenses",   href: "/org/expenses",  icon: DollarSign },
  { label: "Donations",  href: "/org/donations", icon: HeartHandshake },
  { label: "Documents",  href: "/org/documents", icon: FileCheck2 },
  { label: "Team",       href: "/org/members",   icon: UsersIcon },
  { label: "Settings",   href: "/org/settings",  icon: Settings },
];

const MOBILE_PRIMARY_ITEMS = [
  { label: "Home",   href: "/dashboard", icon: LayoutDashboard },
  { label: "Cases",  href: "/cases",     icon: FolderHeart },
  { label: "Map",    href: "/map",       icon: Map },
  { label: "Profile",href: "/profile",   icon: UserIcon },
];

const ORG_MOBILE_PRIMARY_ITEMS = [
  { label: "Overview", href: "/org/dashboard", icon: LayoutDashboard },
  { label: "Animals",  href: "/org/animals",    icon: Cat },
  { label: "Tasks",    href: "/org/tasks",      icon: ClipboardList },
  { label: "Team",     href: "/org/members",    icon: Users },
];

const CITIZEN_NAV_GROUPS = [
  { label: "Your Space", hrefs: ["/dashboard"], collapsible: false },
  { label: "Animal Welfare", hrefs: ["/animals", "/cases", "/respond", "/map", "/adopt", "/foster", "/lost-found", "/wildlife", "/safety", "/abc", "/cruelty"], collapsible: false },
  { label: "Community & Support", hrefs: ["/funding", "/my/donations", "/community", "/collectives", "/partners", "/ambulance"], collapsible: false },
  { label: "Stories & Remembrance", hrefs: ["/memorials", "/community-stories"], collapsible: false },
  { label: "More", hrefs: ["/beta/feedback", "/profile", "/legal", "/privacy", "/terms"], collapsible: true },
];

const STAFF_NAV_GROUPS = [
  { label: "Overview", hrefs: ["/dashboard"], collapsible: false },
  { label: "Animal Welfare", hrefs: ["/admin/cases", "/map", "/cruelty", "/respond", "/animals"], collapsible: false },
  { label: "Operations & Reviews", hrefs: ["/dispatch", "/adoption-admin", "/rehome/review", "/admin/verifications", "/admin/reimbursements", "/admin/partner-requests", "/admin/ambulance"], collapsible: false },
  { label: "Community & Impact", hrefs: ["/admin/memorials", "/admin/community-stories", "/funding", "/impact", "/admin/beta/feedback"], collapsible: false },
  { label: "Administration", hrefs: ["/admin/users", "/admin/library"], collapsible: false },
  { label: "Account", hrefs: ["/profile", "/legal", "/privacy", "/terms"], collapsible: true },
];

const ORG_NAV_GROUPS = [
  { label: "Switch Space", hrefs: ["/collectives", "/dashboard"], collapsible: false },
  { label: "Workspace", hrefs: ["/org/dashboard", "/org/animals", "/org/tasks", "/org/events"], collapsible: false },
  { label: "People", hrefs: ["/org/volunteers", "/org/members"], collapsible: false },
  { label: "Records & Finance", hrefs: ["/org/expenses", "/org/donations", "/org/documents"], collapsible: false },
  { label: "Settings", hrefs: ["/org/settings"], collapsible: false },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout, isLoading, bootstrap } = useAuth();
  const isStaff = user?.role === "admin" || user?.role === "govt";
  const isNgo = user?.role === "ngo";
  const isOrgWorkspace = pathname === "/org" || pathname.startsWith("/org/");
  const showOrgNav = !isStaff && (isNgo || isOrgWorkspace);
  const navItems = isStaff
    ? ADMIN_NAV_ITEMS.filter((item) => item.href !== "/admin/library" || user?.role === "admin")
    : showOrgNav
      ? [
          { label: "My Collectives", href: "/collectives", icon: HeartHandshake },
          { label: "Citizen Dashboard", href: "/dashboard", icon: HomeIcon },
          ...ORG_NAV_ITEMS,
        ]
      : BASE_NAV_ITEMS;
  const mobilePrimaryItems = showOrgNav ? ORG_MOBILE_PRIMARY_ITEMS : MOBILE_PRIMARY_ITEMS;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (!user) void bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, user, pathname, router]);

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

  if (isLoading || !user) return <div className="min-h-screen bg-background flex items-center justify-center"><PageSpinner label="Loading Finding Astro..." /></div>;

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

  const renderNavigation = () => {
    const groups = showOrgNav ? ORG_NAV_GROUPS : isStaff ? STAFF_NAV_GROUPS : CITIZEN_NAV_GROUPS;

    return (
      <>
        {groups.map((section) => {
          const items = navItems.filter((item) => section.hrefs.includes(item.href));
          if (items.length === 0) return null;

          const sectionHasActiveItem = items.some((item) => isActive(item.href));
          if (section.collapsible) {
            return (
              <details key={section.label} className="group px-1 py-1" open={sectionHasActiveItem || undefined}>
                <summary className="flex cursor-pointer list-none items-center justify-between rounded-md px-3 py-2 text-[10px] font-black uppercase tracking-widest text-outline hover:bg-surface-container [&::-webkit-details-marker]:hidden">
                  {section.label}
                  <span aria-hidden="true" className="text-xs transition-transform group-open:rotate-180">⌄</span>
                </summary>
                <div className="mt-1 space-y-0.5">
                  {items.map(item => <NavLink key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />)}
                </div>
              </details>
            );
          }

          return (
            <section key={section.label} aria-label={section.label} className="mb-2">
              <p className="px-4 pt-3 pb-1 text-[10px] font-black uppercase tracking-widest text-outline">{section.label}</p>
              <div className="space-y-0.5">
                {items.map(item => <NavLink key={item.href} item={item} onClick={() => setMobileMenuOpen(false)} />)}
              </div>
            </section>
          );
        })}
      </>
    );
  };

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row relative">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex md:flex-col md:w-64 bg-surface-container-low border-r border-outline-variant h-screen sticky top-0">
        <div className="p-5 border-b border-outline-variant shrink-0">
          <Link href={showOrgNav ? "/org/dashboard" : "/dashboard"}>
            <Logo showTagline />
          </Link>
        </div>
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {renderNavigation()}
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
      <div className="flex-1 flex flex-col min-w-0 min-h-screen md:h-screen md:min-h-0 overflow-y-auto pb-[calc(5rem+env(safe-area-inset-bottom))] md:pb-0">
        {/* Top bar */}
        <header className="bg-surface border-b-2 border-outline-variant min-h-16 flex items-center justify-between gap-2 px-3 sm:px-gutter z-20 shrink-0 sticky top-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setMobileMenuOpen(true)} className="md:hidden p-2 rounded-md text-on-surface-variant hover:bg-surface-container-high transition-colors">
              <MenuIcon className="w-5 h-5" />
            </button>
            <span className="flex items-center gap-2 md:hidden">
              <LogoMark className="w-6 h-6" />
              <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary truncate">Finding Astro</span>
            </span>
          </div>
          <div className="flex items-center gap-1 sm:gap-3 relative shrink-0">
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
              <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-1rem)] bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl overflow-hidden z-50 origin-top-right animate-fade-up">
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

        <main className="flex-1 min-w-0 p-2.5 sm:p-gutter">{children}</main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-40 flex justify-around items-center gap-1 px-1.5 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] bg-surface border-t border-outline-variant shadow-[0_-2px_8px_rgba(0,0,0,0.04)]">
        {mobilePrimaryItems.map(item => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                "flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-1.5 transition-transform duration-150 ease-out active:scale-90",
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
          className="flex flex-1 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1.5 py-1.5 text-on-surface-variant transition-transform duration-150 ease-out active:scale-90"
        >
          <MoreHorizontal className="w-5 h-5" />
          <span className="font-label-caps text-[10px]">More</span>
        </button>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-inverse-surface/40 backdrop-blur-sm transition-opacity duration-200 ease-out" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-[min(18rem,calc(100vw-2.5rem))] max-w-[calc(100vw-2.5rem)] bg-surface-container-lowest h-full shadow-2xl transition-transform duration-200 ease-out">
            <div className="flex items-center justify-between gap-2 p-4 sm:p-5 border-b border-outline-variant">
              <span className="flex items-center gap-2">
                <LogoMark className="w-7 h-7" />
                <span className="font-headline-lg-mobile text-headline-lg-mobile text-primary">Finding Astro</span>
              </span>
              <button onClick={() => setMobileMenuOpen(false)} className="p-2 rounded-md text-on-surface-variant hover:bg-surface-container-high">
                <XIcon className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
              {renderNavigation()}
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
