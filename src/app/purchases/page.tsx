"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag,
  Plus,
  RefreshCw,
  Search,
  Truck,
  CheckCircle,
  X,
  Trash2,
  Calendar,
} from "lucide-react";
import { formatINR, formatDate } from "@/lib/utils";
import { useLiveRefresh } from "@/lib/useLiveRefresh";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [medicines, setMedicines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [showNewPurchaseModal, setShowNewPurchaseModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form State
  const [supplierId, setSupplierId] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().split("T")[0]);
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Purchase Items State
  const [items, setItems] = useState<any[]>([
    {
      medicineId: "",
      batchNumber: "",
      expiryDate: "",
      quantity: 100,
      freeQuantity: 0,
      purchasePrice: 0,
      mrp: 0,
      gstRate: 12,
    },
  ]);

  const fetchPurchases = (silent = false) => {
    if (!silent) setLoading(true);
    fetch("/api/purchases", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setPurchases(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setPurchases([]);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchPurchases();
    fetch("/api/suppliers", { cache: "no-store" })
      .then((res) => res.json())
      .then((sups) => setSuppliers(Array.isArray(sups) ? sups : []))
      .catch(() => setSuppliers([]));
    fetch("/api/medicines", { cache: "no-store" })
      .then((res) => res.json())
      .then((meds) => setMedicines(Array.isArray(meds) ? meds : []))
      .catch(() => setMedicines([]));
  }, []);
  useLiveRefresh(() => fetchPurchases(true));

  const handleAddItemRow = () => {
    setItems([
      ...items,
      {
        medicineId: "",
        batchNumber: "",
        expiryDate: "",
        quantity: 50,
        freeQuantity: 0,
        purchasePrice: 0,
        mrp: 0,
        gstRate: 12,
      },
    ]);
  };

  const handleRemoveItemRow = (idx: number) => {
    setItems(items.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: any) => {
    const updated = [...items];
    updated[idx][field] = value;

    if (field === "medicineId") {
      const med = medicines.find((m) => m.id === value);
      if (med) {
        updated[idx].purchasePrice = med.purchasePrice;
        updated[idx].mrp = med.mrp;
        updated[idx].gstRate = med.gstRate;
      }
    }
    setItems(updated);
  };

  // Calculations
  const calculatedSubtotal = items.reduce((sum, item) => {
    return sum + (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
  }, 0);

  const calculatedTax = items.reduce((sum, item) => {
    const sub = (Number(item.quantity) || 0) * (Number(item.purchasePrice) || 0);
    return sum + (sub * (Number(item.gstRate) || 0)) / 100;
  }, 0);

  const calculatedTotal = calculatedSubtotal + calculatedTax;

  const handleSubmitPurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || !invoiceNumber || items.length === 0) return;

    // Validate that medicineId, batchNumber, and expiryDate exist
    for (const item of items) {
      if (!item.medicineId || !item.batchNumber || !item.expiryDate) {
        alert("Please specify Medicine, Batch Number, and Expiry Date for all items.");
        return;
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          supplierId,
          invoiceNumber,
          purchaseDate,
          paidAmount: parseFloat(paidAmount) || calculatedTotal,
          notes,
          items,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record purchase");
      }

      setShowNewPurchaseModal(false);
      setSupplierId("");
      setInvoiceNumber("");
      setPaidAmount("");
      setNotes("");
      setItems([
        {
          medicineId: "",
          batchNumber: "",
          expiryDate: "",
          quantity: 100,
          freeQuantity: 0,
          purchasePrice: 0,
          mrp: 0,
          gstRate: 12,
        },
      ]);
      fetchPurchases();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Purchase Invoices & Inward Stock</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Log supplier bills, automatically update batch inventory & track wholesale accounts
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => fetchPurchases()}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowNewPurchaseModal(true)}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>New Purchase Entry</span>
          </button>
        </div>
      </div>

      {/* Purchases List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Purchase Bill #</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Supplier Agency</th>
                <th className="py-3 px-4">Items Inwarded</th>
                <th className="py-3 px-4 text-right">Taxable</th>
                <th className="py-3 px-4 text-right">Total Amount</th>
                <th className="py-3 px-4 text-right">Paid</th>
                <th className="py-3 px-4 text-center">Payment Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading purchase history...</span>
                  </td>
                </tr>
              ) : purchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No purchase bills recorded yet. Click &quot;New Purchase Entry&quot; to log stock.
                  </td>
                </tr>
              ) : (
                purchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-bold font-mono text-blue-600">{p.invoiceNumber}</td>
                    <td className="py-3 px-4 text-slate-600">{formatDate(p.purchaseDate)}</td>
                    <td className="py-3 px-4 font-semibold text-slate-800">{p.supplier?.name}</td>
                    <td className="py-3 px-4 text-slate-600">
                      {p.items?.map((item: any) => item.medicine?.name).join(", ") || "-"}
                    </td>
                    <td className="py-3 px-4 text-right text-slate-700">₹{p.subtotal.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      {formatINR(p.totalAmount)}
                    </td>
                    <td className="py-3 px-4 text-right font-semibold text-emerald-700">
                      ₹{p.paidAmount.toFixed(2)}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          p.paymentStatus === "PAID"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-amber-100 text-amber-800"
                        }`}
                      >
                        {p.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Entry Modal */}
      {showNewPurchaseModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Inward Purchase Bill Entry</h3>
                <p className="text-xs text-slate-500">Stock will be increased immediately upon save</p>
              </div>
              <button onClick={() => setShowNewPurchaseModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPurchase} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier Agency *</label>
                  <select
                    required
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="">Select Supplier</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Supplier Bill / Invoice # *</label>
                  <input
                    type="text"
                    required
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="e.g. AP-99214"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Date *</label>
                  <input
                    type="date"
                    required
                    value={purchaseDate}
                    onChange={(e) => setPurchaseDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {/* Purchase Items Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <h4 className="font-bold text-slate-800">Inward Medicine Batches</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="py-1 px-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg text-[11px] flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add Item</span>
                  </button>
                </div>

                <div className="overflow-x-auto p-2">
                  <table className="w-full text-left">
                    <thead className="text-[11px] text-slate-500 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2">Medicine *</th>
                        <th className="py-2 px-2">Batch # *</th>
                        <th className="py-2 px-2">Expiry *</th>
                        <th className="py-2 px-2">Qty *</th>
                        <th className="py-2 px-2">Free</th>
                        <th className="py-2 px-2">Purchase Rate (₹)</th>
                        <th className="py-2 px-2">MRP (₹)</th>
                        <th className="py-2 px-2">GST%</th>
                        <th className="py-2 px-2 text-center">Del</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-1.5 px-2 min-w-[180px]">
                            <select
                              required
                              value={item.medicineId}
                              onChange={(e) => handleItemChange(idx, "medicineId", e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs"
                            >
                              <option value="">Select Medicine</option>
                              {medicines.map((m) => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.company})
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="py-1.5 px-2 w-28">
                            <input
                              type="text"
                              required
                              placeholder="Batch"
                              value={item.batchNumber}
                              onChange={(e) => handleItemChange(idx, "batchNumber", e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-32">
                            <input
                              type="date"
                              required
                              value={item.expiryDate}
                              onChange={(e) => handleItemChange(idx, "expiryDate", e.target.value)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-20">
                            <input
                              type="number"
                              required
                              min={1}
                              value={item.quantity}
                              onChange={(e) => handleItemChange(idx, "quantity", parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-16">
                            <input
                              type="number"
                              min={0}
                              value={item.freeQuantity}
                              onChange={(e) => handleItemChange(idx, "freeQuantity", parseInt(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-24">
                            <input
                              type="number"
                              step="0.01"
                              value={item.purchasePrice}
                              onChange={(e) => handleItemChange(idx, "purchasePrice", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-24">
                            <input
                              type="number"
                              step="0.01"
                              value={item.mrp}
                              onChange={(e) => handleItemChange(idx, "mrp", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2 w-16">
                            <input
                              type="number"
                              value={item.gstRate}
                              onChange={(e) => handleItemChange(idx, "gstRate", parseFloat(e.target.value) || 0)}
                              className="w-full px-2 py-1.5 bg-slate-50 border border-slate-200 rounded text-slate-800 text-xs"
                            />
                          </td>
                          <td className="py-1.5 px-2 text-center">
                            {items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveItemRow(idx)}
                                className="text-rose-500 hover:text-rose-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary and Payment */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="space-y-2">
                  <label className="block font-semibold text-slate-700">Remarks / Purchase Notes</label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Optional notes or supplier payment terms"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>

                <div className="space-y-2 text-right">
                  <div className="text-slate-600">Taxable Value: ₹{calculatedSubtotal.toFixed(2)}</div>
                  <div className="text-slate-600">Total GST: ₹{calculatedTax.toFixed(2)}</div>
                  <div className="text-sm font-bold text-slate-900">
                    Grand Total: {formatINR(calculatedTotal)}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2">
                    <span className="font-semibold text-slate-700">Amount Paid (₹):</span>
                    <input
                      type="number"
                      step="0.01"
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder={String(calculatedTotal.toFixed(2))}
                      className="w-32 px-2 py-1.5 bg-white border border-slate-200 rounded text-slate-900 font-bold text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewPurchaseModal(false)}
                  className="flex-1 py-2 font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {submitting ? "Saving Inward Stock..." : "Save & Update Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

