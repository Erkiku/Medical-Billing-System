"use client";

import { useEffect, useState } from "react";
import { Store, Clock } from "lucide-react";
import { useStore } from "@/context/StoreContext";

export function Header() {
  const [time, setTime] = useState("");
  const { storeInfo } = useStore();

  useEffect(() => {
    const update = () => {
      setTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="no-print sticky top-0 z-30 h-14 bg-white/95 backdrop-blur-xs border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-xs">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-slate-800 font-bold text-sm tracking-tight">
          <div className="h-7 w-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Store className="h-4 w-4" />
          </div>
          <span className="text-slate-900 text-sm font-bold">
            {storeInfo?.storeName || "Medical Store"}
          </span>
        </div>
        {storeInfo?.gstin && (
          <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 font-mono">
            GSTIN: {storeInfo.gstin}
          </span>
        )}
        {storeInfo?.dlNumber1 && (
          <span className="hidden lg:inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 font-mono">
            D.L: {storeInfo.dlNumber1}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 text-xs font-medium text-slate-600">
        <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-slate-700">
          <Clock className="h-3.5 w-3.5 text-blue-600" />
          <span className="font-mono text-xs">{time || "Loading..."}</span>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <kbd className="px-2 py-1 bg-slate-100 border border-slate-300 rounded text-slate-600 text-[11px] font-mono shadow-xs font-bold">
            F2
          </kbd>
          <span className="text-slate-500 text-xs">New Bill</span>
        </div>
      </div>
    </header>
  );
}
