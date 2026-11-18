"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { StoreProvider } from "@/context/StoreContext";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === "/login";
  const [authChecked, setAuthChecked] = useState(isLoginPage);

  // Check authentication on initial load - unauthenticated users go straight to /login
  useEffect(() => {
    if (isLoginPage) {
      setAuthChecked(true);
      return;
    }

    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        if (!data || !data.authenticated) {
          router.replace("/login");
        } else {
          setAuthChecked(true);
        }
      })
      .catch(() => {
        router.replace("/login");
      });
  }, [isLoginPage, router]);

  // Global keyboard shortcuts (e.g., F2 for new billing)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        router.push("/billing");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [router]);

  if (isLoginPage) {
    return <main className="min-h-screen bg-slate-50">{children}</main>;
  }

  // Show a clean minimal loader while verifying authentication
  if (!authChecked) {
    return (
      <div className="min-h-screen w-screen flex items-center justify-center bg-slate-900 text-slate-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400">Loading Medical Pro...</p>
        </div>
      </div>
    );
  }

  return (
    <StoreProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-900">
        <Sidebar />
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          <Header />
          <main className="flex-1 p-6 overflow-y-auto">{children}</main>
        </div>
      </div>
    </StoreProvider>
  );
}
