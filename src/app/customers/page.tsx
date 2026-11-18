"use client";

import { useEffect, useState } from "react";
import {
  Users,
  Search,
  Plus,
  RefreshCw,
  Phone,
  DollarSign,
  MessageSquare,
  FileText,
  X,
  CreditCard,
  ArrowRight,
  TrendingDown,
} from "lucide-react";
import { formatINR, formatDate, formatDateTime } from "@/lib/utils";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Customer Ledger Modal
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [ledgerData, setLedgerData] = useState<any | null>(null);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  // Collect Payment Modal
  const [showCollectPaymentModal, setShowCollectPaymentModal] = useState(false);
  const [collectAmount, setCollectAmount] = useState("");
  const [paymentMode, setPaymentMode] = useState("CASH");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [paymentSaving, setPaymentSaving] = useState(false);

  // Add Customer Modal
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [custForm, setCustForm] = useState({ name: "", mobile: "", email: "", address: "" });
  const [custSaving, setCustSaving] = useState(false);

  const fetchCustomers = () => {
    setLoading(true);
    fetch(`/api/customers?search=${encodeURIComponent(search)}`)
      .then((res) => res.json())
      .then((data) => {
        setCustomers(data || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers();
  };

  const openCustomerLedger = (cust: any) => {
    setSelectedCustomer(cust);
    setLedgerLoading(true);
    fetch(`/api/customers/${cust.id}`)
      .then((res) => res.json())
      .then((data) => {
        setLedgerData(data);
        setLedgerLoading(false);
      })
      .catch(() => setLedgerLoading(false));
  };

  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !collectAmount) return;
    const num = parseFloat(collectAmount);
    if (isNaN(num) || num <= 0) return;

    setPaymentSaving(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          amount: num,
          paymentMethod: paymentMode,
          notes: paymentNotes || "Customer ledger payment",
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Payment recording failed");
      }

      setShowCollectPaymentModal(false);
      setCollectAmount("");
      setPaymentNotes("");
      // Refresh ledger & customers
      openCustomerLedger(selectedCustomer);
      fetchCustomers();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setPaymentSaving(false);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custForm.name || !custForm.mobile) return;

    setCustSaving(true);
    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(custForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create customer");
      }

      setShowAddCustomerModal(false);
      setCustForm({ name: "", mobile: "", email: "", address: "" });
      fetchCustomers();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setCustSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Customers & Outstanding Ledger (Udhaar)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Credit accounts, payment histories, running statement of accounts & collections
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchCustomers}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Customer</span>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 max-w-md w-full">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name or 10-digit mobile..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
          >
            Search
          </button>
        </form>
      </div>

      {/* Customers List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Mobile</th>
                <th className="py-3 px-4">Address</th>
                <th className="py-3 px-4 text-right">Total Purchases</th>
                <th className="py-3 px-4 text-right">Total Paid</th>
                <th className="py-3 px-4 text-right">Balance Due (Udhaar)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading customer accounts...</span>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400">
                    No customers found matching search.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      <button
                        onClick={() => openCustomerLedger(c)}
                        className="text-blue-600 hover:underline text-left font-bold"
                      >
                        {c.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono font-medium text-slate-700">{c.mobile}</td>
                    <td className="py-3 px-4 text-slate-600">{c.address || "-"}</td>
                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      {formatINR(c.totalPurchases)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      {formatINR(c.totalPaid)}
                    </td>
                    <td className="py-3 px-4 text-right font-bold">
                      <span className={c.balanceDue > 0 ? "text-rose-600 font-bold" : "text-emerald-700"}>
                        {formatINR(c.balanceDue)}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openCustomerLedger(c)}
                          className="py-1 px-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-100 font-semibold text-xs"
                        >
                          View Ledger
                        </button>
                        {c.balanceDue > 0 && (
                          <button
                            onClick={() => {
                              setSelectedCustomer(c);
                              setCollectAmount(String(c.balanceDue));
                              setShowCollectPaymentModal(true);
                            }}
                            className="py-1 px-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs"
                          >
                            Collect Dues
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

      {/* Customer Ledger Statement Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Customer Statement & Ledger: {selectedCustomer.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono">Mobile: {selectedCustomer.mobile}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Quick Balance Overview */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] uppercase font-bold text-slate-400">Total Billed</span>
                <p className="text-sm font-bold text-slate-900">{formatINR(selectedCustomer.totalPurchases)}</p>
              </div>
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-100">
                <span className="text-[10px] uppercase font-bold text-emerald-600">Total Received</span>
                <p className="text-sm font-bold text-emerald-800">{formatINR(selectedCustomer.totalPaid)}</p>
              </div>
              <div className="bg-rose-50 p-3 rounded-xl border border-rose-100">
                <span className="text-[10px] uppercase font-bold text-rose-600">Current Balance Due</span>
                <p className="text-sm font-bold text-rose-800">{formatINR(selectedCustomer.balanceDue)}</p>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Transaction Ledger History
                </h4>
                {selectedCustomer.balanceDue > 0 && (
                  <button
                    onClick={() => {
                      setCollectAmount(String(selectedCustomer.balanceDue));
                      setShowCollectPaymentModal(true);
                    }}
                    className="py-1 px-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs"
                  >
                    + Record Payment
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Type</th>
                      <th className="py-2.5 px-3">Description</th>
                      <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                      <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {ledgerLoading ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Loading ledger entries...
                        </td>
                      </tr>
                    ) : !ledgerData?.ledgers || ledgerData.ledgers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          No ledger transactions recorded yet.
                        </td>
                      </tr>
                    ) : (
                      ledgerData.ledgers.map((l: any) => (
                        <tr key={l.id} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-600">{formatDate(l.date)}</td>
                          <td className="py-2 px-3 font-semibold text-slate-800">{l.type}</td>
                          <td className="py-2 px-3 text-slate-700">{l.description}</td>
                          <td className="py-2 px-3 text-right font-medium text-slate-900">
                            {l.debit > 0 ? `₹${l.debit.toFixed(2)}` : "-"}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-emerald-700">
                            {l.credit > 0 ? `₹${l.credit.toFixed(2)}` : "-"}
                          </td>
                          <td className="py-2 px-3 text-right font-bold text-slate-800">
                            ₹{l.balance.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collect Payment Modal */}
      {showCollectPaymentModal && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Collect Pending Dues</h3>
              <button onClick={() => setShowCollectPaymentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs">
              <p>
                Customer: <span className="font-bold text-slate-800">{selectedCustomer.name}</span>
              </p>
              <p className="mt-0.5">
                Current Due: <span className="font-bold text-rose-600">{formatINR(selectedCustomer.balanceDue)}</span>
              </p>
            </div>

            <form onSubmit={handleCollectPayment} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Amount Received (₹) *</label>
                <input
                  type="number"
                  required
                  min={1}
                  step="0.01"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-emerald-700 focus:bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Payment Method</label>
                <div className="grid grid-cols-4 gap-2">
                  {["CASH", "UPI", "CARD", "BANK_TRANSFER"].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMode(m)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border ${
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

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Receipt Notes / Transaction Ref</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="e.g. Received via GPay or cash counter"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCollectPaymentModal(false)}
                  className="flex-1 py-2 font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={paymentSaving}
                  className="flex-1 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {paymentSaving ? "Processing..." : "Confirm & Save Receipt"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Modal */}
      {showAddCustomerModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Customer</h3>
              <button onClick={() => setShowAddCustomerModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer / Patient Name *</label>
                <input
                  type="text"
                  required
                  value={custForm.name}
                  onChange={(e) => setCustForm({ ...custForm, name: e.target.value })}
                  placeholder="e.g. Vinod Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mobile Number (10 digits) *</label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={custForm.mobile}
                  onChange={(e) => setCustForm({ ...custForm, mobile: e.target.value })}
                  placeholder="9876543210"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Address / Locality</label>
                <input
                  type="text"
                  value={custForm.address}
                  onChange={(e) => setCustForm({ ...custForm, address: e.target.value })}
                  placeholder="Street / Area name"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email (Optional)</label>
                <input
                  type="email"
                  value={custForm.email}
                  onChange={(e) => setCustForm({ ...custForm, email: e.target.value })}
                  placeholder="name@example.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddCustomerModal(false)}
                  className="flex-1 py-2 font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={custSaving}
                  className="flex-1 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {custSaving ? "Saving..." : "Save Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

