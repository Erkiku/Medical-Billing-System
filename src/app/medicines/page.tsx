"use client";

import { useEffect, useState } from "react";
import {
  Pill,
  Search,
  Plus,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  Clock,
  Package,
  Layers,
  CheckCircle,
  X,
  Edit2,
  Trash2,
} from "lucide-react";
import { formatINR, formatDate, isExpired, isNearExpiry } from "@/lib/utils";
import { useLiveRefresh } from "@/lib/useLiveRefresh";

export default function MedicinesPage() {
  const [medicines, setMedicines] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [categoriesError, setCategoriesError] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSchedule, setSelectedSchedule] = useState("");

  // Modals
  const [showAddMedicineModal, setShowAddMedicineModal] = useState(false);
  const [showAddBatchModal, setShowAddBatchModal] = useState(false);
  const [targetMedicineForBatch, setTargetMedicineForBatch] = useState<any | null>(null);

  // Quick Stock Update Modal State
  const [showStockModal, setShowStockModal] = useState(false);
  const [targetMed, setTargetMed] = useState<any | null>(null);
  const [stockModalMode, setStockModalMode] = useState<"new_batch" | "existing_batch">("new_batch");
  const [selectedBatchId, setSelectedBatchId] = useState("");
  const [restockBatchNumber, setRestockBatchNumber] = useState("");
  const [restockExpiry, setRestockExpiry] = useState("");
  const [restockMfg, setRestockMfg] = useState("");
  const [restockQty, setRestockQty] = useState("100");
  const [isAdditive, setIsAdditive] = useState(true);
  const [restockPurchasePrice, setRestockPurchasePrice] = useState("");
  const [restockMrp, setRestockMrp] = useState("");
  const [successBanner, setSuccessBanner] = useState<string | null>(null);

  // New Medicine Form State
  const [medForm, setMedForm] = useState({
    name: "",
    genericName: "",
    saltComposition: "",
    company: "",
    categoryId: "",
    barcode: "",
    packSize: "1×10",
    schedule: "NONE",
    purchasePrice: "",
    mrp: "",
    sellingPrice: "",
    gstRate: "12",
    minStockLevel: "15",
    // Initial Batch
    batchNumber: "",
    expiryDate: "",
    quantity: "",
  });

  // New Batch Form State
  const [batchForm, setBatchForm] = useState({
    batchNumber: "",
    mfgDate: "",
    expiryDate: "",
    quantity: "50",
    purchasePrice: "",
    mrp: "",
  });

  const [saving, setSaving] = useState(false);

  const fetchMedicines = (silent = false) => {
    if (!silent) setLoading(true);
    let url = `/api/medicines?search=${encodeURIComponent(search)}`;
    if (selectedCategory) url += `&categoryId=${selectedCategory}`;
    if (selectedSchedule) url += `&schedule=${selectedSchedule}`;

    fetch(url, { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setMedicines(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setMedicines([]);
        setLoading(false);
      });
  };

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/categories", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load categories.");
      setCategories(Array.isArray(data) ? data : []);
      setCategoriesError("");
    } catch (error) {
      setCategoriesError((error as Error).message);
    }
  };

  useEffect(() => {
    fetchMedicines();
  }, [selectedCategory, selectedSchedule]);
  useLiveRefresh(() => fetchMedicines(true));

  useEffect(() => {
    fetchCategories();
  }, []);
  useLiveRefresh(fetchCategories);

  const handleCreateCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;

    setSavingCategory(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save category.");

      setCategories((current) => {
        const alreadyLoaded = current.some((category) => category.id === data.id);
        return alreadyLoaded ? current : [...current, data].sort((a, b) => a.name.localeCompare(b.name));
      });
      setMedForm((current) => ({ ...current, categoryId: data.id }));
      setNewCategoryName("");
      setCategoriesError("");
    } catch (error) {
      setCategoriesError((error as Error).message);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchMedicines();
  };

  const handleCreateMedicine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!medForm.name || !medForm.company) return;

    setSaving(true);
    try {
      const res = await fetch("/api/medicines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(medForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create medicine");
      }

      setShowAddMedicineModal(false);
      setMedForm({
        name: "",
        genericName: "",
        saltComposition: "",
        company: "",
        categoryId: "",
        barcode: "",
        packSize: "1×10",
        schedule: "NONE",
        purchasePrice: "",
        mrp: "",
        sellingPrice: "",
        gstRate: "12",
        minStockLevel: "15",
        batchNumber: "",
        expiryDate: "",
        quantity: "",
      });
      fetchMedicines();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMedicineForBatch || !batchForm.batchNumber || !batchForm.expiryDate) return;

    setSaving(true);
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          medicineId: targetMedicineForBatch.id,
          batchNumber: batchForm.batchNumber,
          mfgDate: batchForm.mfgDate || null,
          expiryDate: batchForm.expiryDate,
          quantity: parseInt(batchForm.quantity) || 0,
          purchasePrice: parseFloat(batchForm.purchasePrice) || targetMedicineForBatch.purchasePrice || 0,
          mrp: parseFloat(batchForm.mrp) || targetMedicineForBatch.mrp || 0,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to add batch");
      }

      setShowAddBatchModal(false);
      setTargetMedicineForBatch(null);
      setBatchForm({
        batchNumber: "",
        mfgDate: "",
        expiryDate: "",
        quantity: "50",
        purchasePrice: "",
        mrp: "",
      });
      fetchMedicines();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const openStockModal = (med: any, batchToEdit?: any) => {
    setTargetMed(med);
    const futureExpiry = new Date();
    futureExpiry.setFullYear(futureExpiry.getFullYear() + 2);
    const defaultExpStr = futureExpiry.toISOString().split("T")[0];

    if (batchToEdit) {
      setStockModalMode("existing_batch");
      setSelectedBatchId(batchToEdit.id);
      setRestockBatchNumber(batchToEdit.batchNumber);
      setRestockExpiry(
        batchToEdit.expiryDate
          ? new Date(batchToEdit.expiryDate).toISOString().split("T")[0]
          : defaultExpStr
      );
      setRestockMfg(
        batchToEdit.mfgDate
          ? new Date(batchToEdit.mfgDate).toISOString().split("T")[0]
          : ""
      );
      setRestockQty(String(batchToEdit.quantity));
      setIsAdditive(false);
      setRestockPurchasePrice(String(batchToEdit.purchasePrice || med.purchasePrice || ""));
      setRestockMrp(String(batchToEdit.mrp || med.mrp || ""));
    } else {
      const codePrefix = (med.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "") || "MED");
      const randomNum = Math.floor(1000 + Math.random() * 9000);
      const generatedBatch = `${codePrefix}-${randomNum}`;

      if (med.activeStock === 0 && med.batches && med.batches.length > 0) {
        setStockModalMode("new_batch");
        setSelectedBatchId(med.batches[0].id);
      } else {
        setStockModalMode("new_batch");
        setSelectedBatchId(med.batches?.[0]?.id || "");
      }

      setRestockBatchNumber(generatedBatch);
      setRestockExpiry(defaultExpStr);
      setRestockMfg(new Date().toISOString().split("T")[0]);
      setRestockQty("100");
      setIsAdditive(true);
      setRestockPurchasePrice(String(med.purchasePrice || ""));
      setRestockMrp(String(med.mrp || ""));
    }

    setShowStockModal(true);
  };

  const handleSelectBatchToEdit = (batchId: string) => {
    setSelectedBatchId(batchId);
    if (!targetMed) return;
    const b = targetMed.batches?.find((item: any) => item.id === batchId);
    if (b) {
      setRestockBatchNumber(b.batchNumber);
      setRestockExpiry(
        b.expiryDate ? new Date(b.expiryDate).toISOString().split("T")[0] : ""
      );
      setRestockMfg(
        b.mfgDate ? new Date(b.mfgDate).toISOString().split("T")[0] : ""
      );
      setRestockQty(String(b.quantity));
      setIsAdditive(false);
      setRestockPurchasePrice(String(b.purchasePrice || targetMed.purchasePrice || ""));
      setRestockMrp(String(b.mrp || targetMed.mrp || ""));
    }
  };

  const handleSaveStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetMed) return;

    setSaving(true);
    try {
      if (stockModalMode === "existing_batch" && selectedBatchId) {
        const res = await fetch(`/api/batches/${selectedBatchId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quantity: parseInt(restockQty) || 0,
            isAdditive,
            expiryDate: restockExpiry,
            mfgDate: restockMfg || null,
            purchasePrice: parseFloat(restockPurchasePrice) || undefined,
            mrp: parseFloat(restockMrp) || undefined,
            batchNumber: restockBatchNumber || undefined,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to update batch");
        }
      } else {
        if (!restockBatchNumber || !restockExpiry) {
          throw new Error("Batch Number and Expiry Date are required");
        }

        const res = await fetch("/api/batches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            medicineId: targetMed.id,
            batchNumber: restockBatchNumber,
            mfgDate: restockMfg || null,
            expiryDate: restockExpiry,
            quantity: parseInt(restockQty) || 0,
            purchasePrice: parseFloat(restockPurchasePrice) || targetMed.purchasePrice || 0,
            mrp: parseFloat(restockMrp) || targetMed.mrp || 0,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "Failed to add batch");
        }
      }

      setShowStockModal(false);
      setSuccessBanner(`Stock successfully updated for "${targetMed.name}"!`);
      setTimeout(() => setSuccessBanner(null), 5000);
      fetchMedicines();
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Medicines & Inventory Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage formulations, multiple batch tracking, FEFO dispatch & expiry control
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchMedicines}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Refresh</span>
          </button>
          <button
            onClick={() => setShowAddMedicineModal(true)}
            className="py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add Medicine</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Category & Schedule Filters */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-slate-500">Schedule:</span>
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Schedules</option>
              <option value="NONE">General (OTC / None)</option>
              <option value="H">Schedule H</option>
              <option value="H1">Schedule H1</option>
              <option value="C">Schedule C</option>
              <option value="C1">Schedule C1</option>
              <option value="X">Schedule X</option>
            </select>
          </div>
        </div>

        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full sm:max-w-md">
          <div className="relative flex-1">
            <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Name, Generic, Salt, Company or Barcode..."
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

      {/* Success Notification Banner */}
      {successBanner && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top duration-300">
          <div className="flex items-center gap-2.5 text-emerald-800 font-semibold text-xs">
            <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{successBanner}</span>
          </div>
          <button
            onClick={() => setSuccessBanner(null)}
            className="text-emerald-500 hover:text-emerald-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Medicine Details</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Pack</th>
                <th className="py-3 px-4 text-right">MRP</th>
                <th className="py-3 px-4 text-right">Selling Rate</th>
                <th className="py-3 px-4 text-center">Active Stock</th>
                <th className="py-3 px-4">Batches (FEFO Ordered)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <RefreshCw className="h-5 w-5 animate-spin mx-auto mb-2 text-blue-600" />
                    <span>Loading medicine database...</span>
                  </td>
                </tr>
              ) : medicines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    No medicines found. Click &quot;Add Medicine&quot; to register a new product.
                  </td>
                </tr>
              ) : (
                medicines.map((med) => (
                  <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm">{med.name}</span>
                        {med.schedule && med.schedule !== "NONE" && (
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              med.schedule === "H1" || med.schedule === "X"
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : med.schedule === "H"
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : "bg-blue-100 text-blue-800 border border-blue-300"
                            }`}
                          >
                            Sch {med.schedule}
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {med.saltComposition || med.genericName || med.company}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Mfg: <span className="text-slate-600 font-medium">{med.company}</span>
                        {med.barcode && ` • Barcode: ${med.barcode}`}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium text-[11px]">
                        {med.category?.name || "General"}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">{med.packSize}</td>

                    <td className="py-3 px-4 text-right font-medium text-slate-700">
                      ₹{med.mrp.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-right font-bold text-slate-900">
                      ₹{med.sellingPrice.toFixed(2)}
                    </td>

                    <td className="py-3 px-4 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openStockModal(med)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold cursor-pointer transition-all ${
                          med.activeStock === 0
                            ? "bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100"
                            : med.isLowStock
                            ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                            : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                        }`}
                        title="Click to update stock"
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            med.activeStock === 0
                              ? "bg-rose-500"
                              : med.isLowStock
                              ? "bg-amber-500"
                              : "bg-emerald-500"
                          }`}
                        />
                        <span>{med.activeStock === 0 ? "0 in stock" : `${med.activeStock} in stock`}</span>
                      </button>
                      {med.isLowStock && med.activeStock > 0 && (
                        <span className="block text-[10px] text-amber-600 mt-0.5">
                          Low (Min: {med.minStockLevel})
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4 min-w-[300px]">
                      <div className="space-y-1.5">
                        {med.batches.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">No batches created</span>
                        ) : (
                          med.batches.map((b: any) => {
                            const exp = isExpired(b.expiryDate);
                            const near = isNearExpiry(b.expiryDate, 90);
                            return (
                              <div
                                key={b.id}
                                onClick={() => openStockModal(med, b)}
                                className={`px-2.5 py-1.5 rounded-lg border text-xs flex items-center justify-between gap-3 cursor-pointer hover:shadow-xs transition-all whitespace-nowrap ${
                                  exp
                                    ? "bg-rose-50/70 border-rose-200 text-rose-800 hover:bg-rose-100/70"
                                    : near
                                    ? "bg-amber-50/70 border-amber-200 text-amber-800 hover:bg-amber-100/70"
                                    : "bg-slate-50 border-slate-200 text-slate-800 hover:bg-white hover:border-slate-300"
                                }`}
                                title="Click to edit quantity or expiry"
                              >
                                <div className="flex items-center gap-2 whitespace-nowrap">
                                  <span className="font-mono font-bold text-slate-900">{b.batchNumber}</span>
                                  <span className="text-[11px] text-slate-500">
                                    Exp: <span className="font-medium text-slate-700">{formatDate(b.expiryDate)}</span>
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 whitespace-nowrap font-medium">
                                  <span className={`font-bold ${exp ? "text-rose-700" : "text-slate-800"}`}>
                                    {b.quantity} pcs
                                  </span>
                                  {exp ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-200">
                                      <AlertCircle className="h-3 w-3 text-rose-600" />
                                      <span>Expired</span>
                                    </span>
                                  ) : near ? (
                                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                                      <Clock className="h-3 w-3 text-amber-600" />
                                      <span>Exp Soon</span>
                                    </span>
                                  ) : null}
                                  <span className="p-0.5 rounded text-slate-400 hover:text-blue-600 transition-colors">
                                    <Edit2 className="h-3.5 w-3.5" />
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => openStockModal(med)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all ml-auto ${
                          med.activeStock === 0
                            ? "bg-blue-600 hover:bg-blue-700 text-white"
                            : "border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900"
                        }`}
                        title="Update stock or add batch"
                      >
                        <Plus className="h-3.5 w-3.5" />
                        <span>{med.activeStock === 0 ? "Restock" : "Update Stock"}</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Medicine Modal */}
      {showAddMedicineModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Add New Medicine to Catalog</h3>
              <button onClick={() => setShowAddMedicineModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateMedicine} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Medicine Name *</label>
                  <input
                    type="text"
                    required
                    value={medForm.name}
                    onChange={(e) => setMedForm({ ...medForm, name: e.target.value })}
                    placeholder="e.g. Dolo 650 Tablet"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Company / Manufacturer *</label>
                  <input
                    type="text"
                    required
                    value={medForm.company}
                    onChange={(e) => setMedForm({ ...medForm, company: e.target.value })}
                    placeholder="e.g. Micro Labs Ltd"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic Name</label>
                  <input
                    type="text"
                    value={medForm.genericName}
                    onChange={(e) => setMedForm({ ...medForm, genericName: e.target.value })}
                    placeholder="e.g. Paracetamol"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Salt Composition</label>
                  <input
                    type="text"
                    value={medForm.saltComposition}
                    onChange={(e) => setMedForm({ ...medForm, saltComposition: e.target.value })}
                    placeholder="e.g. Paracetamol 650mg"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={medForm.categoryId}
                    onChange={(e) => setMedForm({ ...medForm, categoryId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="">Select Category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  {categoriesError && (
                    <p role="alert" className="mt-1 text-xs text-rose-700">{categoriesError}</p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <input
                      type="text"
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Add a category"
                      aria-label="New medicine category"
                      className="min-w-0 flex-1 px-2.5 py-2 bg-white border border-slate-200 rounded-lg text-slate-800 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      disabled={!newCategoryName.trim() || savingCategory}
                      className="px-3 py-2 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold disabled:opacity-50"
                    >
                      {savingCategory ? "Saving..." : "Add & select"}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Drug Schedule</span>
                    <span className="text-[10px] text-blue-600 font-bold uppercase">H, H1, C, X</span>
                  </label>
                  <select
                    value={medForm.schedule}
                    onChange={(e) => setMedForm({ ...medForm, schedule: e.target.value })}
                    className={`w-full px-3 py-2 border rounded-lg font-bold text-xs transition-colors ${
                      medForm.schedule === "H1" || medForm.schedule === "X"
                        ? "bg-rose-50 border-rose-300 text-rose-800"
                        : medForm.schedule === "H"
                        ? "bg-amber-50 border-amber-300 text-amber-800"
                        : medForm.schedule === "C" || medForm.schedule === "C1"
                        ? "bg-blue-50 border-blue-300 text-blue-800"
                        : "bg-slate-50 border-slate-200 text-slate-800 font-medium"
                    }`}
                  >
                    <option value="NONE">General (OTC / Non-Scheduled)</option>
                    <option value="H">Schedule H (Prescription Required)</option>
                    <option value="H1">Schedule H1 (Warning / Restricted Antibiotics)</option>
                    <option value="C">Schedule C (Biological Products)</option>
                    <option value="C1">Schedule C1 (Special Biologicals)</option>
                    <option value="X">Schedule X (Narcotics / Psychotropics)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pack Size</label>
                  <input
                    type="text"
                    value={medForm.packSize}
                    onChange={(e) => setMedForm({ ...medForm, packSize: e.target.value.replace(/x/gi, "×") })}
                    placeholder="1×10 or 1×15"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode</label>
                  <input
                    type="text"
                    value={medForm.barcode}
                    onChange={(e) => setMedForm({ ...medForm, barcode: e.target.value })}
                    placeholder="Scan or enter code"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              {medForm.schedule && medForm.schedule !== "NONE" && (
                <div
                  className={`p-2.5 rounded-lg border text-[11px] font-medium flex items-center gap-2 ${
                    medForm.schedule === "H1" || medForm.schedule === "X"
                      ? "bg-rose-50 border-rose-200 text-rose-800"
                      : medForm.schedule === "H"
                      ? "bg-amber-50 border-amber-200 text-amber-800"
                      : "bg-blue-50 border-blue-200 text-blue-800"
                  }`}
                >
                  <span className="font-bold">
                    {medForm.schedule === "H" && "⚠️ Schedule H Warning: To be sold by retail on the prescription of a Registered Medical Practitioner (RMP) only."}
                    {medForm.schedule === "H1" && "🔴 Schedule H1 Warning: Restricted habit-forming/antibiotic drug. Mandatory prescription register record required."}
                    {medForm.schedule === "C" && "🧬 Schedule C Drug: Biological / antibiotic product subject to special storage conditions."}
                    {medForm.schedule === "C1" && "🧬 Schedule C1 Drug: Special biological product requiring batch & cold chain storage records."}
                    {medForm.schedule === "X" && "⛔ Schedule X Warning: Narcotic / Psychotropic substance. Duplicate prescription & 2-year register maintenance mandatory."}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={medForm.purchasePrice}
                    onChange={(e) => setMedForm({ ...medForm, purchasePrice: e.target.value })}
                    placeholder="25.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={medForm.mrp}
                    onChange={(e) => setMedForm({ ...medForm, mrp: e.target.value })}
                    placeholder="35.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Rate (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={medForm.sellingPrice}
                    onChange={(e) => setMedForm({ ...medForm, sellingPrice: e.target.value })}
                    placeholder="33.00"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={medForm.gstRate}
                    onChange={(e) => setMedForm({ ...medForm, gstRate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </div>
              </div>

              {/* Initial Batch Section */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-3">
                <p className="font-bold text-blue-900">Optional: Add Initial Batch Stock</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Batch Number</label>
                    <input
                      type="text"
                      value={medForm.batchNumber}
                      onChange={(e) => setMedForm({ ...medForm, batchNumber: e.target.value })}
                      placeholder="e.g. B-998"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Expiry Date</label>
                    <input
                      type="date"
                      value={medForm.expiryDate}
                      onChange={(e) => setMedForm({ ...medForm, expiryDate: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      value={medForm.quantity}
                      onChange={(e) => setMedForm({ ...medForm, quantity: e.target.value })}
                      placeholder="e.g. 100"
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-800"
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMedicineModal(false)}
                  className="flex-1 py-2 font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Medicine"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {showAddBatchModal && targetMedicineForBatch && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">Add New Batch</h3>
                <p className="text-xs text-blue-600 font-medium">{targetMedicineForBatch.name}</p>
              </div>
              <button onClick={() => setShowAddBatchModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBatch} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  required
                  value={batchForm.batchNumber}
                  onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                  placeholder="e.g. DL-9041"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Mfg Date (Optional)</label>
                  <input
                    type="date"
                    value={batchForm.mfgDate}
                    onChange={(e) => setBatchForm({ ...batchForm, mfgDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    required
                    value={batchForm.expiryDate}
                    onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Quantity *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={batchForm.quantity}
                    onChange={(e) => setBatchForm({ ...batchForm, quantity: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchForm.purchasePrice}
                    onChange={(e) => setBatchForm({ ...batchForm, purchasePrice: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchForm.mrp}
                    onChange={(e) => setBatchForm({ ...batchForm, mrp: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddBatchModal(false)}
                  className="flex-1 py-2 font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Batch Stock"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comprehensive Update Medicine Stock Modal */}
      {showStockModal && targetMed && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[92vh] overflow-y-auto space-y-4">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg">
                    <Package className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 leading-tight">
                      Update Medicine Stock
                    </h3>
                    <p className="text-xs text-blue-600 font-bold">{targetMed.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-500">
                    {targetMed.company} • {targetMed.packSize}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      targetMed.activeStock === 0
                        ? "bg-rose-100 text-rose-700"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {targetMed.activeStock === 0
                      ? "OUT OF STOCK (0 pcs)"
                      : `${targetMed.activeStock} in stock`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowStockModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Mode Switcher Tabs (Add Fresh Batch vs Edit/Extend Existing Batch) */}
            {targetMed.batches && targetMed.batches.length > 0 && (
              <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-xl text-xs font-bold text-slate-600">
                <button
                  type="button"
                  onClick={() => setStockModalMode("new_batch")}
                  className={`py-2 rounded-lg transition-all ${
                    stockModalMode === "new_batch"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "hover:text-slate-900"
                  }`}
                >
                  + Add Fresh Stock (New Batch)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStockModalMode("existing_batch");
                    if (!selectedBatchId && targetMed.batches[0]) {
                      handleSelectBatchToEdit(targetMed.batches[0].id);
                    }
                  }}
                  className={`py-2 rounded-lg transition-all ${
                    stockModalMode === "existing_batch"
                      ? "bg-white text-blue-700 shadow-xs"
                      : "hover:text-slate-900"
                  }`}
                >
                  Edit / Restock Existing Batch
                </button>
              </div>
            )}

            <form onSubmit={handleSaveStock} className="space-y-4 text-xs">
              {/* If Existing Batch Mode */}
              {stockModalMode === "existing_batch" && targetMed.batches?.length > 0 ? (
                <div className="space-y-3.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Select Batch to Update / Restock *
                    </label>
                    <select
                      value={selectedBatchId}
                      onChange={(e) => handleSelectBatchToEdit(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {targetMed.batches.map((b: any) => {
                        const exp = isExpired(b.expiryDate);
                        return (
                          <option key={b.id} value={b.id}>
                            {b.batchNumber} — Current: {b.quantity} pcs (Exp: {formatDate(b.expiryDate)}
                            {exp ? " - EXPIRED" : ""})
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Quantity Mode: Add to stock or set absolute */}
                  <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 space-y-2">
                    <span className="block font-bold text-blue-900 text-[11px] uppercase tracking-wider">
                      Stock Quantity Update
                    </span>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                        <input
                          type="radio"
                          name="isAdditive"
                          checked={isAdditive}
                          onChange={() => setIsAdditive(true)}
                          className="text-blue-600"
                        />
                        <span className="font-semibold">Add more pcs to stock (+)</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-slate-700">
                        <input
                          type="radio"
                          name="isAdditive"
                          checked={!isAdditive}
                          onChange={() => setIsAdditive(false)}
                          className="text-blue-600"
                        />
                        <span className="font-semibold">Set exact quantity (=)</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <input
                        type="number"
                        min="0"
                        required
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
                        placeholder="Quantity"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex gap-1">
                        {["+20", "+50", "+100"].map((chip) => (
                          <button
                            key={chip}
                            type="button"
                            onClick={() => {
                              const add = parseInt(chip.replace("+", ""));
                              setRestockQty(String((parseInt(restockQty) || 0) + add));
                            }}
                            className="px-2 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-md font-bold hover:bg-blue-50 text-[11px]"
                          >
                            {chip}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Expiry Date (critical for out-of-stock items that expired!) */}
                  <div>
                    <label className="block font-semibold text-slate-700 mb-1">
                      Batch Expiry Date * (Extend date to make stock active & saleable)
                    </label>
                    <input
                      type="date"
                      required
                      value={restockExpiry}
                      onChange={(e) => setRestockExpiry(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Tip: Setting a future expiry date unblocks expired stock and makes it immediately available in Billing.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={restockPurchasePrice}
                        onChange={(e) => setRestockPurchasePrice(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={restockMrp}
                        onChange={(e) => setRestockMrp(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* New Fresh Batch Mode */
                <div className="space-y-3.5">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-semibold text-slate-700">Batch Number *</label>
                      <button
                        type="button"
                        onClick={() => {
                          const prefix = (targetMed.name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "") || "MED");
                          setRestockBatchNumber(`${prefix}-${Math.floor(1000 + Math.random() * 9000)}`);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:underline"
                      >
                        ⚡ Auto-Generate
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      value={restockBatchNumber}
                      onChange={(e) => setRestockBatchNumber(e.target.value)}
                      placeholder="e.g. AG-6251"
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Mfg Date (Optional)</label>
                      <input
                        type="date"
                        value={restockMfg}
                        onChange={(e) => setRestockMfg(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                      <input
                        type="date"
                        required
                        value={restockExpiry}
                        onChange={(e) => setRestockExpiry(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Quantity to Add */}
                  <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-2">
                    <label className="block font-bold text-emerald-900 text-[11px] uppercase tracking-wider">
                      Stock Quantity to Add (pcs) *
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="1"
                        required
                        value={restockQty}
                        onChange={(e) => setRestockQty(e.target.value)}
                        placeholder="Quantity"
                        className="flex-1 px-3 py-2 bg-white border border-slate-300 rounded-lg text-slate-900 font-bold text-sm focus:ring-2 focus:ring-emerald-500"
                      />
                      <div className="flex gap-1">
                        {["50", "100", "200"].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => setRestockQty(num)}
                            className="px-2.5 py-1.5 bg-white border border-emerald-200 text-emerald-800 rounded-md font-bold hover:bg-emerald-50 text-[11px]"
                          >
                            +{num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">Purchase Price (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={restockPurchasePrice}
                        onChange={(e) => setRestockPurchasePrice(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                    <div>
                      <label className="block font-semibold text-slate-700 mb-1">MRP (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={restockMrp}
                        onChange={(e) => setRestockMrp(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowStockModal(false)}
                  className="flex-1 py-2.5 font-semibold text-slate-600 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {saving ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Saving Stock...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      <span>{stockModalMode === "existing_batch" ? "Update Batch Stock" : "Add Stock to Table"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

