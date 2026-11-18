"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, User, AlertCircle, ArrowRight, Eye, EyeOff, ShieldAlert, ArrowLeft } from "lucide-react";

export default function AdminLoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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
          isAdminLogin: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Admin authentication failed");
      }

      if (data.user) {
        try {
          localStorage.setItem("medical_user_info", JSON.stringify(data.user));
        } catch {}
      }

      if (data.store) {
        try {
          localStorage.setItem("medical_store_info", JSON.stringify(data.store));
          if (data.store.storeName) {
            localStorage.setItem("medical_store_name", data.store.storeName);
            document.cookie = `medical_store_name=${encodeURIComponent(data.store.storeName)}; path=/; max-age=2592000; SameSite=Lax`;
          }
          window.dispatchEvent(new CustomEvent("store-updated", { detail: data.store }));
        } catch {}
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        {/* Admin Brand Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-purple-700 to-slate-900 p-6 text-white text-center relative overflow-hidden">
          <div className="absolute top-2 right-3">
            <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 shadow-xs">
              Root Access
            </span>
          </div>

          <div className="inline-flex p-3 bg-white/10 rounded-2xl backdrop-blur-xs mb-3 shadow-inner">
            <ShieldCheck className="h-9 w-9 text-amber-300" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Admin & Developer Portal</h1>
          <p className="text-purple-200 text-xs mt-1">Medical Pro ERP System Controller</p>
        </div>

        {/* Form Container */}
        <div className="p-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Administrator Sign In</h2>
              <p className="text-xs text-slate-500">
                Authorized developer & admin credentials only
              </p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Admin Authentication Notice</span>
                <span>{error}</span>
              </div>
            </div>
          )}

          <form
            action="/admin/login"
            method="POST"
            onSubmit={handleSubmit}
            autoComplete="on"
            className="space-y-4"
          >
            <div>
              <label htmlFor="admin-username" className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Username
              </label>
              <div className="relative">
                <User className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="admin-username"
                  name="admin_username"
                  type="text"
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. eduvikku@007 or admin"
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all font-mono font-medium"
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-password" className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Password
              </label>
              <div className="relative">
                <Lock className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <input
                  id="admin-password"
                  name="admin_password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:bg-white transition-all"
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
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-700 to-indigo-700 hover:from-purple-800 hover:to-indigo-800 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer mt-2"
            >
              <span>{loading ? "Verifying Admin Access..." : "Sign In to Admin Console"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </form>

          {/* Switch back to Store login */}
          <div className="mt-6 pt-4 border-t border-slate-100 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Back to Pharmacy Store Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
