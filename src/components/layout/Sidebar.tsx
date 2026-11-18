"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  Pill,
  ShoppingBag,
  Users,
  Truck,
  BarChart3,
  Settings,
  LogOut,
  PlusCircle,
  ShieldCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useStore } from "@/context/StoreContext";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "POS Billing", href: "/billing", icon: Receipt, highlight: true },
  { name: "Invoices & Bills", href: "/invoices", icon: FileText },
  { name: "Medicines & Stock", href: "/medicines", icon: Pill },
  { name: "Purchases", href: "/purchases", icon: ShoppingBag },
  { name: "Customers & Ledger", href: "/customers", icon: Users },
  { name: "Suppliers", href: "/suppliers", icon: Truck },
  { name: "Reports & GST", href: "/reports", icon: BarChart3 },
  { name: "Store Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { storeInfo, userInfo } = useStore();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  // Generate initials for avatar (e.g. "SM" for Sagar Medical)
  const storeInitials = storeInfo?.storeName
    ? storeInfo.storeName
        .split(" ")
        .filter(Boolean)
        .map((w) => w[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()
    : "MP";

  return (
    <aside className="no-print w-64 bg-slate-900 text-slate-100 flex flex-col shrink-0 h-full border-r border-slate-800 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/30 shrink-0">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <h1 className="font-bold text-sm text-white truncate leading-tight">
              {storeInfo?.storeName || "Medical Pro"}
            </h1>
            <p className="text-[11px] text-blue-400 font-medium">Pharmacy ERP & Billing</p>
          </div>
        </Link>
      </div>

      {/* Quick Action Button */}
      <div className="px-4 pt-3 pb-2 shrink-0">
        <Link
          href="/billing"
          className="flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md transition-all active:scale-[0.98]"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Bill (F2)</span>
        </Link>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold transition-colors",
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
              )}
            >
              <Icon
                className={cn(
                  "h-4 w-4",
                  isActive ? "text-white" : "text-slate-400 group-hover:text-white"
                )}
              />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Footer & Logout */}
      <div className="p-3.5 border-t border-slate-800 flex items-center justify-between bg-slate-950/60 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-blue-700 text-white flex items-center justify-center text-xs font-bold shrink-0 shadow-xs">
            {storeInitials}
          </div>
          <div className="text-xs min-w-0">
            <p className="font-bold text-slate-100 truncate max-w-[130px]" title={storeInfo?.storeName}>
              {storeInfo?.storeName || "Medical Store"}
            </p>
            <p className="text-[10px] text-slate-400 truncate max-w-[130px]">
              {userInfo?.name || "Staff"} • <span className="text-blue-400 font-semibold">{userInfo?.role || "STAFF"}</span>
            </p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          title="Sign Out"
          className="p-1.5 rounded-md text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors shrink-0"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </aside>
  );
}
