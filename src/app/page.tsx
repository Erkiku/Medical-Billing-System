"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  TrendingUp,
  Receipt,
  Pill,
  Package,
  AlertTriangle,
  Clock,
  Skull,
  Users,
  ArrowRight,
  Plus,
  RefreshCw,
  CreditCard,
} from "lucide-react";
import { formatINR, formatDate, formatDateTime } from "@/lib/utils";

interface DashboardData {
  todaySales: number;
  monthlySales: number;
  totalMedicines: number;
  totalStockValue: number;
  lowStockCount: number;
  nearExpiryCount: number;
  expiredCount: number;
  totalCustomerDues: number;
  recentBills: any[];
  recentPayments: any[];
  salesTrend: { day: string; date: string; amount: number }[];
  lowStockList: any[];
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = () => {
    setLoading(true);
    fetch("/api/dashboard/stats")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((d) => {
        if (d && !d.error && Array.isArray(d.salesTrend)) {
          setData(d);
        } else {
          setData({
            todaySales: 0,
            monthlySales: 0,
            totalMedicines: 0,
            totalStockValue: 0,
            lowStockCount: 0,
            nearExpiryCount: 0,
            expiredCount: 0,
            totalCustomerDues: 0,
            recentBills: [],
            recentPayments: [],
            salesTrend: [
              { day: "Mon", date: "", amount: 0 },
              { day: "Tue", date: "", amount: 0 },
              { day: "Wed", date: "", amount: 0 },
              { day: "Thu", date: "", amount: 0 },
              { day: "Fri", date: "", amount: 0 },
              { day: "Sat", date: "", amount: 0 },
              { day: "Sun", date: "", amount: 0 },
            ],
            lowStockList: [],
          });
        }
        setLoading(false);
      })
      .catch((err) => {
        console.warn("Failed to load dashboard stats, using defaults:", err);
        setData({
          todaySales: 0,
          monthlySales: 0,
          totalMedicines: 0,
          totalStockValue: 0,
          lowStockCount: 0,
          nearExpiryCount: 0,
          expiredCount: 0,
          totalCustomerDues: 0,
          recentBills: [],
          recentPayments: [],
          salesTrend: [
            { day: "Mon", date: "", amount: 0 },
            { day: "Tue", date: "", amount: 0 },
            { day: "Wed", date: "", amount: 0 },
            { day: "Thu", date: "", amount: 0 },
            { day: "Fri", date: "", amount: 0 },
            { day: "Sat", date: "", amount: 0 },
            { day: "Sun", date: "", amount: 0 },
          ],
          lowStockList: [],
        });
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2 text-slate-500 text-sm">
          <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
          <span>Loading Dashboard Metrics...</span>
        </div>
      </div>
    );
  }

  const maxSale = Math.max(...(data?.salesTrend?.map((t) => t.amount) || [1000]), 100);

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Pharmacy Operations Dashboard</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time medical inventory, GST sales performance & customer receivables
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchStats}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/billing"
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Open POS Counter (F2)</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Today's Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Today&apos;s Sales</span>
            <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">
              {formatINR(data?.todaySales || 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Live daily billing counter</p>
          </div>
        </div>

        {/* Monthly Sales */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Monthly Revenue</span>
            <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Receipt className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">
              {formatINR(data?.monthlySales || 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">Current calendar month total</p>
          </div>
        </div>

        {/* Customer Dues */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Customer Dues (Udhaar)</span>
            <div className="h-9 w-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-amber-700">
              {formatINR(data?.totalCustomerDues || 0)}
            </h3>
            <Link href="/customers" className="text-[11px] text-blue-600 hover:underline mt-1 inline-block">
              View customer ledger &rarr;
            </Link>
          </div>
        </div>

        {/* Stock Valuation */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Stock Value</span>
            <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Package className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-3">
            <h3 className="text-2xl font-bold text-slate-900">
              {formatINR(data?.totalStockValue || 0)}
            </h3>
            <p className="text-[11px] text-slate-500 mt-1">{data?.totalMedicines || 0} unique medicines</p>
          </div>
        </div>
      </div>

      {/* Critical Stock Alerts Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Low Stock Alert */}
        <Link
          href="/reports?type=low-stock"
          className="bg-amber-50/70 border border-amber-200 p-4 rounded-xl flex items-center justify-between hover:bg-amber-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-amber-900">Low Stock Items</p>
              <p className="text-lg font-bold text-amber-800">{data?.lowStockCount || 0} medicines</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-amber-700" />
        </Link>

        {/* Near Expiry Alert */}
        <Link
          href="/reports?type=expiry"
          className="bg-orange-50/70 border border-orange-200 p-4 rounded-xl flex items-center justify-between hover:bg-orange-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-900">Expiring in 90 Days</p>
              <p className="text-lg font-bold text-orange-800">{data?.nearExpiryCount || 0} batches</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-orange-700" />
        </Link>

        {/* Expired Stock Alert */}
        <Link
          href="/reports?type=expiry"
          className="bg-rose-50/70 border border-rose-200 p-4 rounded-xl flex items-center justify-between hover:bg-rose-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center">
              <Skull className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-900">Expired Stock (Locked)</p>
              <p className="text-lg font-bold text-rose-800">{data?.expiredCount || 0} batches</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-rose-700" />
        </Link>
      </div>

      {/* Main Section: Sales Trend Chart & Recent Bills */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Chart (Last 7 Days) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">Sales Trend (Last 7 Days)</h2>
              <p className="text-xs text-slate-500">Daily gross turnover</p>
            </div>
            <Link href="/reports" className="text-xs text-blue-600 font-medium hover:underline flex items-center gap-1">
              <span>View full reports</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          {/* Bar Chart Representation */}
          <div className="h-56 flex items-end gap-3 pt-6 pb-2 px-2 border-b border-slate-100">
            {data?.salesTrend?.map((item, idx) => {
              const heightPct = Math.max(8, Math.round((item.amount / maxSale) * 100));
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2 group h-full justify-end">
                  <div className="text-[10px] font-semibold text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    ₹{item.amount.toFixed(0)}
                  </div>
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[42px] bg-blue-600 hover:bg-blue-500 rounded-t-md transition-all shadow-xs group-hover:scale-y-[1.03] origin-bottom"
                  />
                  <div className="text-center">
                    <p className="text-[11px] font-bold text-slate-700">{item.day}</p>
                    <p className="text-[10px] text-slate-400">{item.date}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Low Stock Fast Reorder Widget */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-bold text-slate-900">Stock Reorder Alert</h2>
              <Link href="/reports?type=low-stock" className="text-xs text-blue-600 hover:underline">
                View All
              </Link>
            </div>
            <div className="space-y-3 mt-4">
              {Array.isArray(data?.lowStockList) && data.lowStockList.length > 0 ? (
                data.lowStockList.map((item) => (
                  <div key={item.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-800">{item.name}</p>
                      <p className="text-[11px] text-slate-500">{item.company}</p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-100 text-rose-700">
                        {item.activeStock} left
                      </span>
                      <p className="text-[10px] text-slate-400 mt-0.5">Min: {item.minStockLevel}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-slate-400">
                  All active medicine stock levels are above threshold!
                </div>
              )}
            </div>
          </div>
          <Link
            href="/purchases"
            className="mt-4 w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg text-center transition-colors block"
          >
            Create Purchase Bill from Supplier
          </Link>
        </div>
      </div>

      {/* Recent Bills and Recent Payments Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent Customer Bills</h2>
            <Link href="/invoices" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <span>All bills</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Bill No.</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.isArray(data?.recentBills) && data.recentBills.length > 0 ? (
                  data.recentBills.map((inv) => (
                    <tr key={inv.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-blue-600">{inv.invoiceNumber}</td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{inv.patientName}</td>
                      <td className="py-2.5 px-3 font-bold text-slate-900">{formatINR(inv.grandTotal)}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            inv.paymentStatus === "PAID"
                              ? "bg-emerald-100 text-emerald-800"
                              : inv.paymentStatus === "PARTIAL"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-xs font-semibold text-slate-600 hover:text-blue-600 hover:underline"
                        >
                          View / Print
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No invoices yet. Click &quot;New Bill (F2)&quot; to make your first sale!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Payment Collections */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-slate-900">Recent Payment Receipts</h2>
            <Link href="/customers" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
              <span>Customer Ledgers</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Mode</th>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Ref Bill</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {Array.isArray(data?.recentPayments) && data.recentPayments.length > 0 ? (
                  data.recentPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{p.customer?.name}</td>
                      <td className="py-2.5 px-3 font-bold text-emerald-700">{formatINR(p.amount)}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-semibold">
                          {p.paymentMethod}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">{formatDate(p.paidAt)}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">{p.invoice?.invoiceNumber || "-"}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400">
                      No payments recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

