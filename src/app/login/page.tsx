"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  Lock,
  User,
  Store,
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldAlert,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [storeName, setStoreName] = useState("SAGAR MEDICAL STORE");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const cached = localStorage.getItem("medical_store_name");
      if (cached) {
        setStoreName(cached);
      } else {
        fetch("/api/settings")
          .then((res) => res.json())
          .then((data) => {
            if (data?.storeName) setStoreName(data.storeName);
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
          storeName: storeName.trim(),
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        // NEVER show server error details — always generic message
        throw new Error("Authentication Access Denied");
      }

      const finalStoreName = (data.store?.storeName || storeName).trim();

      if (data.token) {
        try {
          const isHttps = typeof window !== "undefined" && window.location.protocol === "https:";
          document.cookie = `medical_session=${encodeURIComponent(data.token)}; path=/; max-age=604800; SameSite=Lax${isHttps ? "; Secure" : ""}`;
        } catch {}
      }

      if (data.user) {
        try {
          localStorage.setItem("medical_user_info", JSON.stringify({ ...data.user, storeName: finalStoreName }));
        } catch {}
      }

      try {
        localStorage.setItem("medical_store_name", finalStoreName);
        if (data.store) {
          localStorage.setItem("medical_store_info", JSON.stringify({ ...data.store, storeName: finalStoreName }));
        }
        document.cookie = `medical_store_name=${encodeURIComponent(finalStoreName)}; path=/; max-age=2592000; SameSite=Lax`;
        window.dispatchEvent(new CustomEvent("store-updated", { detail: { ...(data.store || {}), storeName: finalStoreName } }));
      } catch {}

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError("Authentication Access Denied");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-blue-950">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Brand Banner */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white text-center">
          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-xs mb-3 shadow-inner">
            <ShieldCheck className="h-9 w-9 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Medical Pro</h1>
          <p className="text-blue-100 text-xs mt-1">Pharmacy ERP, POS Billing & Inventory</p>
        </div>

        {/* Login Form */}
        <div className="p-8">
          <h2 className="text-xl font-bold text-slate-800 mb-1">Store Sign In</h2>
          <p className="text-xs text-slate-500 mb-5">
            Enter your pharmacy store name and assigned credentials
          </p>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Authentication Notice</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            autoComplete="on"
            className="space-y-4"
          >
            {/* Store Name Input Box */}
            <div>
              <label htmlFor="login-store-name" className="block text-xs font-semibold text-slate-700 mb-1">
                Pharmacy / Medical Store Name *
              </label>
              <div className="relative">
                <Store className="h-4 w-4 absolute left-3 top-3 text-blue-600" />
                <input
                  id="login-store-name"
                  name="storeName"
                  type="text"
                  autoComplete="organization"
                  spellCheck={false}
                  required
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  placeholder="e.g. R & A Medical Store, Apollo Pharmacy"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-semibold"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                This store name will update across your dashboard, bills & printed invoices.
              </span>
            </div>

            {/* Username Input */}
            <div>
              <label htmlFor="login-username" className="block text-xs font-semibold text-slate-700 mb-1">
                Staff / Pharmacist Username *
              </label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="login-username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter assigned username"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all font-medium font-mono"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="login-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 focus:outline-none transition-colors p-0.5 cursor-pointer"
                  title={showPassword ? "Hide password" : "Show password"}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              <span>{loading ? "Signing in..." : "Sign In to Store ERP"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
