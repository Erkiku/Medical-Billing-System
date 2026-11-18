"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  Search,
  Printer,
  MessageSquare,
  DollarSign,
  Filter,
  Plus,
  RefreshCw,
  ExternalLink,
  Calendar,
} from "lucide-react";
import { formatINR, formatDate, formatDateTime } from "@/lib/utils";

export default function InvoicesListPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedInvoiceForPayment, setSelectedInvoiceForPayment] = useState<any | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [paymentMode, setPaymentMode] = useState<string>("CASH");
  const [paymentLoading, setPaymentLoading] = useState(false);

  const fetchInvoices = () => {
    setLoading(true);
    let url = `/api/invoices?status=${statusFilter}`;
    if (search.trim()) url += `&search=${encodeURIComponent(search)}`;

    fetch(url)
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchInvoices();
  }, [statusFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchInvoices();
  };

  // WhatsApp Reminder Handler
  const handleSendWhatsAppReminder = async (invoiceId: string) => {
    try {
      const res = await fetch("/api/notifications/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, channel: "WHATSAPP" }),
      });
      const data = await res.json();
      if (data.whatsappUrl) {
        window.open(data.whatsappUrl, "_blank");
      } else {
        alert(data.error || "Unable to send reminder");
      }
    } catch {
      alert("Error sending reminder");
    }
  };

  // Payment Collection against this Invoice
  const handleCollectPayment = async () => {
    if (!selectedInvoiceForPayment || !collectAmount) return;
    const num = parseFloat(collectAmount);
    if (isNaN(num) || num <= 0) return;

    setPaymentLoading(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedInvoiceForPayment.customerId,
          invoiceId: selectedInvoiceForPayment.id,
          amount: num,
          paymentMethod: paymentMode,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Payment recording failed");
      }

      setSelectedInvoiceForPayment(null);
      setCollectAmount("");
      fetchInvoices();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Invoices & Billing History</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage tax bills, A4 invoice printing, WhatsApp reminders & payment receipts
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchInvoices}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <Link
            href="/billing"
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Bill (F2)</span>
          </Link>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {["ALL", "PAID", "PARTIAL", "UNPAID"].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === status
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {status === "ALL" ? "All Bills" : status}
            </button>
          ))}
        </div>

        {/* Search input */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Bill #, Patient, Phone..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
          >
            Search
          </button>
        </form>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Invoice #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Patient / Customer</th>
                <th className="py-3 px-4">Doctor</th>
                <th className="py-3 px-4 text-right">Bill Total</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-right">Due Balance</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading invoices...</span>
                  </td>
                </tr>
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No invoices matching your search.
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-bold text-blue-600 font-mono">
                      <Link href={`/invoices/${inv.id}`} className="hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-800">{inv.patientName}</p>
                      {inv.patientMobile && (
                        <p className="text-[11px] text-slate-400 font-mono">{inv.patientMobile}</p>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-600">{inv.doctorName || "-"}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatINR(inv.grandTotal)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {formatINR(inv.paidAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={inv.remainingAmount > 0 ? "text-rose-600" : "text-slate-400"}>
                        {formatINR(inv.remainingAmount)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
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
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* View & Print A4 */}
                        <Link
                          href={`/invoices/${inv.id}`}
                          title="View & Print A4 Invoice"
                          className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-blue-600 transition-colors"
                        >
                          <Printer className="h-4 w-4" />
                        </Link>

                        {/* WhatsApp Reminder if dues remain */}
                        {inv.remainingAmount > 0 && (
                          <button
                            type="button"
                            onClick={() => handleSendWhatsAppReminder(inv.id)}
                            title="Send WhatsApp Payment Reminder"
                            className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 hover:bg-emerald-100 transition-colors"
                          >
                            <MessageSquare className="h-4 w-4" />
                          </button>
                        )}

                        {/* Collect Payment Modal trigger */}
                        {inv.remainingAmount > 0 && inv.customerId && (
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInvoiceForPayment(inv);
                              setCollectAmount(String(inv.remainingAmount));
                            }}
                            title="Collect Pending Payment"
                            className="p-1.5 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100 transition-colors"
                          >
                            <DollarSign className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Collect Payment Dialog Modal */}
      {selectedInvoiceForPayment && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Collect Pending Payment</h3>
              <button
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-xs space-y-1">
              <p>
                <span className="text-slate-500">Bill Number:</span>{" "}
                <span className="font-bold text-slate-800">{selectedInvoiceForPayment.invoiceNumber}</span>
              </p>
              <p>
                <span className="text-slate-500">Customer:</span>{" "}
                <span className="font-bold text-slate-800">{selectedInvoiceForPayment.patientName}</span>
              </p>
              <p>
                <span className="text-slate-500">Remaining Due:</span>{" "}
                <span className="font-bold text-rose-600">
                  {formatINR(selectedInvoiceForPayment.remainingAmount)}
                </span>
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Amount Being Received (₹)
              </label>
              <input
                type="number"
                min={1}
                max={selectedInvoiceForPayment.remainingAmount}
                value={collectAmount}
                onChange={(e) => setCollectAmount(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-emerald-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <div className="grid grid-cols-4 gap-2">
                {["CASH", "UPI", "CARD", "BANK_TRANSFER"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMode(m)}
                    className={`py-1.5 px-2 text-xs font-semibold rounded-lg border ${
                      paymentMode === m
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-slate-50 text-slate-700 border-slate-200"
                    }`}
                  >
                    {m === "BANK_TRANSFER" ? "Bank" : m}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedInvoiceForPayment(null)}
                className="flex-1 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={paymentLoading}
                onClick={handleCollectPayment}
                className="flex-1 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
              >
                {paymentLoading ? "Saving..." : "Confirm & Save Receipt"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

