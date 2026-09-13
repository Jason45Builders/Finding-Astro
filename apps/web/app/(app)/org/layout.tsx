"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      router.replace(`/auth/login?next=${encodeURIComponent(pathname)}`);
      return;
    }
    if (user.role !== "ngo" && user.role !== "govt" && user.role !== "admin") {
      router.replace("/dashboard");
    }
  }, [user, isLoading, router, pathname]);

  if (isLoading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">Loading...</div>;
  }

  if (!user || (user.role !== "ngo" && user.role !== "govt" && user.role !== "admin")) {
    return null;
  }

  return <>{children}</>;
}