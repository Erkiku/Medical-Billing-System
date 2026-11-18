"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Trash2,
  Printer,
  Save,
  CheckCircle2,
  AlertCircle,
  UserPlus,
  Stethoscope,
  CreditCard,
  Percent,
  Calendar,
  X,
  BadgeAlert,
} from "lucide-react";
import { formatINR, numberToIndianWords, formatDate } from "@/lib/utils";

interface BatchInfo {
  id: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  mrp: number;
  purchasePrice: number;
  isExpired: boolean;
}

interface MedicineResult {
  id: string;
  name: string;
  genericName?: string;
  saltComposition?: string;
  company: string;
  barcode?: string;
  packSize: string;
  mrp: number;
  sellingPrice: number;
  gstRate: number;
  totalAvailableQty: number;
  batches: BatchInfo[];
  recommendedBatch: BatchInfo | null;
}

interface BillItem {
  medicineId: string;
  medicineName: string;
  company: string;
  pack: string;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  availableQty: number;
  quantity: number;
  mrp: number;
  unitPrice: number;
  discount: number; // percentage
  gstRate: number;
  amount: number;
}

export default function BillingPage() {
  const router = useRouter();

  // Patient / Customer State
  const [patientName, setPatientName] = useState("");
  const [patientMobile, setPatientMobile] = useState("");
  const [patientAddress, setPatientAddress] = useState("");

  // Doctor State
  const [doctorName, setDoctorName] = useState("");
  const [doctorsList, setDoctorsList] = useState<any[]>([]);

  // Medicine Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<MedicineResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState<MedicineResult | null>(null);
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemUnitPrice, setItemUnitPrice] = useState<number>(0);
  const [itemDiscount, setItemDiscount] = useState<number>(0);

  // Bill Items
  const [items, setItems] = useState<BillItem[]>([]);
  const [overallDiscountPercent, setOverallDiscountPercent] = useState<number>(0);

  // Payment
  const [paidAmount, setPaidAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [notes, setNotes] = useState<string>("");

  // UI status
  const [error, setError] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch doctors for auto-suggest
  useEffect(() => {
    fetch("/api/doctors")
      .then((res) => res.json())
      .then((docs) => setDoctorsList(Array.isArray(docs) ? docs : []))
      .catch(() => setDoctorsList([]));
  }, []);

  // Quick lookup customer by mobile
  const handleMobileLookup = async (mobile: string) => {
    setPatientMobile(mobile);
    if (mobile.length === 10) {
      try {
        const res = await fetch(`/api/customers?search=${mobile}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const cust = data[0];
          setPatientName(cust.name);
          if (cust.address) setPatientAddress(cust.address);
        }
      } catch {}
    }
  };

  // Medicine Search Debounce
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(() => {
      setSearchLoading(true);
      fetch(`/api/medicines/search?q=${encodeURIComponent(searchQuery)}`)
        .then((res) => res.json())
        .then((data) => {
          setSearchResults(Array.isArray(data) ? data : []);
          setSearchLoading(false);
        })
        .catch(() => {
          setSearchResults([]);
          setSearchLoading(false);
        });
    }, 250);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Select a medicine from search dropdown
  const handleSelectMedicine = (med: MedicineResult) => {
    setSelectedMedicine(med);
    // Auto-select FEFO batch (recommended non-expired batch)
    if (med.recommendedBatch) {
      setSelectedBatchId(med.recommendedBatch.id);
      setItemUnitPrice(med.sellingPrice || med.recommendedBatch.mrp);
    } else if (med.batches.length > 0) {
      setSelectedBatchId(med.batches[0].id);
      setItemUnitPrice(med.sellingPrice || med.batches[0].mrp);
    }
    setItemQuantity(1);
    setItemDiscount(0);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Add Item to Bill
  const handleAddItem = () => {
    if (!selectedMedicine || !selectedBatchId) return;

    const chosenBatch = selectedMedicine.batches.find((b) => b.id === selectedBatchId);
    if (!chosenBatch) return;

    if (chosenBatch.isExpired) {
      setError(`Cannot sell expired batch (${chosenBatch.batchNumber})!`);
      return;
    }

    if (itemQuantity <= 0) {
      setError("Quantity must be at least 1");
      return;
    }

    // Check existing quantity in bill
    const existingIndex = items.findIndex((i) => i.batchId === chosenBatch.id);
    const alreadyInBill = existingIndex >= 0 ? items[existingIndex].quantity : 0;
    const totalRequested = alreadyInBill + itemQuantity;

    if (totalRequested > chosenBatch.quantity) {
      setError(
        `Insufficient stock! Available: ${chosenBatch.quantity}, Already in bill: ${alreadyInBill}`
      );
      return;
    }

    setError("");

    const lineGross = itemQuantity * itemUnitPrice;
    const lineDiscount = (lineGross * itemDiscount) / 100;
    const lineTaxable = lineGross - lineDiscount;
    const lineGst = (lineTaxable * (selectedMedicine.gstRate || 12)) / 100;
    const lineAmount = Math.round((lineTaxable + lineGst) * 100) / 100;

    if (existingIndex >= 0) {
      // Update existing item
      const updated = [...items];
      const newQty = updated[existingIndex].quantity + itemQuantity;
      const newGross = newQty * updated[existingIndex].unitPrice;
      const newDisc = (newGross * updated[existingIndex].discount) / 100;
      const newTaxable = newGross - newDisc;
      const newTax = (newTaxable * updated[existingIndex].gstRate) / 100;

      updated[existingIndex].quantity = newQty;
      updated[existingIndex].amount = Math.round((newTaxable + newTax) * 100) / 100;
      setItems(updated);
    } else {
      // Add new item
      const newItem: BillItem = {
        medicineId: selectedMedicine.id,
        medicineName: selectedMedicine.name,
        company: selectedMedicine.company,
        pack: selectedMedicine.packSize,
        batchId: chosenBatch.id,
        batchNumber: chosenBatch.batchNumber,
        expiryDate: chosenBatch.expiryDate,
        availableQty: chosenBatch.quantity,
        quantity: itemQuantity,
        mrp: chosenBatch.mrp,
        unitPrice: itemUnitPrice,
        discount: itemDiscount,
        gstRate: selectedMedicine.gstRate || 12,
        amount: lineAmount,
      };
      setItems([...items, newItem]);
    }

    // Reset medicine picker
    setSelectedMedicine(null);
    setSelectedBatchId("");
    setItemQuantity(1);
    setItemDiscount(0);

    // Refocus search
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 50);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Financial Calculations
  const subtotal = items.reduce((sum, item) => {
    const gross = item.quantity * item.unitPrice;
    const disc = (gross * item.discount) / 100;
    return sum + (gross - disc);
  }, 0);

  const overallDiscountAmount = (subtotal * overallDiscountPercent) / 100;
  const taxableAmount = subtotal - overallDiscountAmount;

  const totalGst = items.reduce((sum, item) => {
    const gross = item.quantity * item.unitPrice;
    const disc = (gross * item.discount) / 100;
    const taxable = gross - disc;
    return sum + (taxable * item.gstRate) / 100;
  }, 0);

  const rawGrandTotal = taxableAmount + totalGst;
  const grandTotal = Math.round(rawGrandTotal);
  const roundOff = Math.round((grandTotal - rawGrandTotal) * 100) / 100;

  // Auto-fill paid amount with grandTotal by default if user hasn't explicitly typed
  const actualPaid =
    paymentMethod === "UNPAID"
      ? 0
      : paidAmount === ""
      ? grandTotal
      : Number(paidAmount) || 0;
  const remainingDues = Math.max(0, grandTotal - actualPaid);

  let currentPaymentStatus = "PAID";
  if (paymentMethod === "UNPAID" || (remainingDues === grandTotal && grandTotal > 0)) {
    currentPaymentStatus = "UNPAID";
  } else if (remainingDues > 0) {
    currentPaymentStatus = "PARTIAL";
  }

  const handlePaymentMethodSelect = (method: string) => {
    setPaymentMethod(method);
    if (method === "UNPAID") {
      setPaidAmount("0");
    } else {
      if (paidAmount === "0") {
        setPaidAmount(String(grandTotal));
      }
    }
  };

  // Submit Bill
  const handleSubmitBill = async (andPrint = false) => {
    if (!patientName.trim()) {
      setError("Please enter patient or customer name");
      return;
    }
    if (items.length === 0) {
      setError("Please add at least one medicine to the bill");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const payload = {
        patientName: patientName.trim(),
        patientMobile: patientMobile.trim(),
        patientAddress: patientAddress.trim(),
        doctorName: doctorName.trim(),
        items: items.map((i) => ({
          medicineId: i.medicineId,
          batchId: i.batchId,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
        })),
        discountPercent: overallDiscountPercent,
        paidAmount: actualPaid,
        paymentMethod,
        notes,
      };

      const res = await fetch("/api/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate invoice");
      }

      // Navigate to invoice A4 view & print
      router.push(`/invoices/${data.id}`);
    } catch (err: unknown) {
      setError((err as Error).message);
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Top Banner / Billing Mode */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <span>Fast POS Billing & GST Counter</span>
            <span className="px-2 py-0.5 text-xs font-semibold rounded bg-emerald-100 text-emerald-800">
              Live Mode
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Auto FEFO batch assignment • Immediate stock decrement • A4 GST Compliant
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setItems([]);
              setPatientName("");
              setPatientMobile("");
              setPatientAddress("");
              setDoctorName("");
              setPaidAmount("");
              setPaymentMethod("CASH");
              setError("");
            }}
            className="px-3 py-2 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            Clear Form
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2 font-medium">
            <BadgeAlert className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Grid: Patient Info & Doctor Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Patient / Customer Info Card */}
        <div className="md:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <UserPlus className="h-3.5 w-3.5 text-blue-600" />
              <span>Customer / Patient Details</span>
            </h2>
            <span className="text-[11px] text-slate-400">Mobile lookup supported</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Patient / Customer Name *
              </label>
              <input
                type="text"
                required
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                placeholder="e.g. Ramesh Kumar or Cash Customer"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Mobile Number (for SMS & WhatsApp)
              </label>
              <input
                type="text"
                maxLength={10}
                value={patientMobile}
                onChange={(e) => handleMobileLookup(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Address / Town
            </label>
            <input
              type="text"
              value={patientAddress}
              onChange={(e) => setPatientAddress(e.target.value)}
              placeholder="e.g. House 42, Civil Lines, Delhi"
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Doctor Info Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Stethoscope className="h-3.5 w-3.5 text-blue-600" />
              <span>Prescribing Doctor</span>
            </h2>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Doctor Name & Hospital
            </label>
            <input
              type="text"
              list="doctors-datalist"
              value={doctorName}
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="e.g. Dr. Rajesh Sharma"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <datalist id="doctors-datalist">
              {doctorsList.map((doc) => (
                <option key={doc.id} value={`${doc.name} (${doc.hospitalOrClinic || "Clinic"})`} />
              ))}
            </datalist>
          </div>
          <p className="text-[11px] text-slate-400">
            Helps maintain Schedule H prescription records for drug control audit.
          </p>
        </div>
      </div>

      {/* Fast Medicine Search & Item Adding Box */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Search className="h-3.5 w-3.5 text-blue-600" />
            <span>Search & Add Medicines</span>
          </h2>
          <span className="text-[11px] text-slate-400">Search by Name, Generic, Salt, Company or Barcode</span>
        </div>

        {/* Search Input with Auto-complete Dropdown */}
        <div className="relative">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type medicine name (e.g. Dolo, Augmentin, Pan 40) or scan barcode..."
              className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchLoading && (
              <span className="absolute right-3 top-3 text-xs text-slate-400">Searching...</span>
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-72 overflow-y-auto divide-y divide-slate-100">
              {searchResults.map((med) => {
                const hasStock = med.totalAvailableQty > 0;
                return (
                  <div
                    key={med.id}
                    onClick={() => handleSelectMedicine(med)}
                    className="p-3 hover:bg-blue-50/70 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{med.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                          {med.packSize}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {med.genericName || med.saltComposition || med.company} •{" "}
                        <span className="text-slate-700 font-medium">{med.company}</span>
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900">
                        {formatINR(med.sellingPrice || med.mrp)}
                      </p>
                      {hasStock ? (
                        <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                          {med.totalAvailableQty} in stock
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Medicine Action Toolbar (when a medicine is picked) */}
        {selectedMedicine && (
          <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-xs font-semibold text-blue-800">Selected Product:</span>
                <h3 className="text-sm font-bold text-slate-900">{selectedMedicine.name}</h3>
                <p className="text-xs text-slate-600">
                  {selectedMedicine.company} | Pack: {selectedMedicine.packSize} | GST: {selectedMedicine.gstRate}%
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMedicine(null)}
                className="text-xs text-slate-400 hover:text-slate-600 self-start sm:self-auto"
              >
                Cancel Selection
              </button>
            </div>

            {/* Batch Picker & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
              {/* Batch Selector */}
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Select Batch (FEFO Auto-sorted)
                </label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => {
                    setSelectedBatchId(e.target.value);
                    const b = selectedMedicine.batches.find((x) => x.id === e.target.value);
                    if (b) setItemUnitPrice(selectedMedicine.sellingPrice || b.mrp);
                  }}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {selectedMedicine.batches.map((b) => (
                    <option key={b.id} value={b.id} disabled={b.isExpired || b.quantity <= 0}>
                      Batch: {b.batchNumber} | Exp: {formatDate(b.expiryDate)} | Qty: {b.quantity} | MRP: ₹{b.mrp}{" "}
                      {b.isExpired ? "(EXPIRED - LOCKED)" : b.quantity <= 0 ? "(NO STOCK)" : "(FEFO Recommended)"}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Quantity</label>
                <input
                  type="number"
                  min={1}
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Discount % */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Disc (%)</label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={itemDiscount}
                  onChange={(e) => setItemDiscount(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleAddItem}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all"
              >
                <Plus className="h-4 w-4" />
                <span>Add to Invoice</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bill Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Invoice Medicine Items ({items.length})
          </h2>
          {items.length > 0 && (
            <button
              onClick={() => setItems([])}
              className="text-xs text-rose-600 hover:underline font-medium"
            >
              Clear All Items
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 whitespace-nowrap">S.No</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Product Description</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Batch</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Pack</th>
                <th className="py-2.5 px-3 whitespace-nowrap">Expiry</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">MRP</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Rate</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Qty</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Disc %</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">GST %</th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Amount (₹)</th>
                <th className="py-2.5 px-3 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-10 text-center text-slate-400">
                    No medicines added yet. Use the search box above to add medicines to this bill.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 text-slate-400 font-mono whitespace-nowrap">{idx + 1}</td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <p className="font-bold text-slate-900 whitespace-nowrap">{item.medicineName}</p>
                      <p className="text-[11px] text-slate-400 whitespace-nowrap">{item.company}</p>
                    </td>
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-700 whitespace-nowrap">
                      {item.batchNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{item.pack}</td>
                    <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{formatDate(item.expiryDate)}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">₹{item.mrp.toFixed(2)}</td>
                    <td className="py-2.5 px-3 text-right font-medium text-slate-800 whitespace-nowrap">
                      ₹{item.unitPrice.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {item.quantity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">{item.discount}%</td>
                    <td className="py-2.5 px-3 text-right text-slate-600 whitespace-nowrap">{item.gstRate}%</td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      ₹{item.amount.toFixed(2)}
                    </td>
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 rounded text-rose-500 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bill Summary, Amount in Words & Payment Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Amount in Words & Notes */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Amount in Indian Words:
            </span>
            <p className="text-sm font-semibold text-slate-800 mt-1 italic bg-slate-50 p-3 rounded-lg border border-slate-100">
              {numberToIndianWords(grandTotal)}
            </p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Invoice Remarks / Patient Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Morning 1 tab, Night 1 tab after meal. Or Doctor Ref: OPD-982."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Quick Payment Mode Selection */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-semibold text-slate-700">
                Payment Method / Status
              </label>
              {paymentMethod === "UNPAID" && (
                <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                  Credit / Udhaar Bill (Pending Payment)
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {[
                { id: "CASH", label: "CASH" },
                { id: "UPI", label: "UPI" },
                { id: "CARD", label: "CARD" },
                { id: "BANK_TRANSFER", label: "Bank/NEFT" },
                { id: "UNPAID", label: "UNPAID (Udhaar)" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handlePaymentMethodSelect(item.id)}
                  className={`py-2 px-2.5 rounded-lg text-xs font-bold border transition-all text-center ${
                    paymentMethod === item.id
                      ? item.id === "UNPAID"
                        ? "bg-rose-600 text-white border-rose-600 shadow-sm ring-2 ring-rose-200"
                        : "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : item.id === "UNPAID"
                      ? "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Calculations & Pay Stamp */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-2">
            Payment Breakdown
          </h2>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Taxable Value:</span>
              <span className="font-semibold">₹{taxableAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>GST (CGST + SGST):</span>
              <span className="font-semibold">₹{totalGst.toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-600">
              <span>Round Off:</span>
              <span className="font-mono">{roundOff >= 0 ? `+₹${roundOff}` : `-₹${Math.abs(roundOff)}`}</span>
            </div>

            <div className="border-t border-slate-200 pt-2 flex justify-between text-base font-bold text-slate-900">
              <span>Grand Total:</span>
              <span className="text-blue-700">{formatINR(grandTotal)}</span>
            </div>
          </div>

          {/* Paid Input & Outstanding Calculation */}
          <div className="pt-3 border-t border-slate-100 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">Amount Paid Now (₹)</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount(String(grandTotal));
                      if (paymentMethod === "UNPAID") setPaymentMethod("CASH");
                    }}
                    className="text-[11px] text-blue-600 hover:underline font-semibold"
                  >
                    Pay Full (₹{grandTotal})
                  </button>
                  <span className="text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={() => {
                      setPaidAmount("0");
                      setPaymentMethod("UNPAID");
                    }}
                    className="text-[11px] text-rose-600 hover:underline font-semibold"
                  >
                    Unpaid (₹0)
                  </button>
                </div>
              </div>
              <input
                type="number"
                min={0}
                max={grandTotal}
                value={paidAmount}
                onChange={(e) => {
                  const val = e.target.value;
                  setPaidAmount(val);
                  if (val === "0") {
                    setPaymentMethod("UNPAID");
                  } else if (paymentMethod === "UNPAID" && Number(val) > 0) {
                    setPaymentMethod("CASH");
                  }
                }}
                placeholder={paymentMethod === "UNPAID" ? "0" : String(grandTotal)}
                className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm font-bold focus:bg-white focus:outline-none focus:ring-2 ${
                  paymentMethod === "UNPAID" || Number(paidAmount) === 0
                    ? "text-rose-600 border-rose-300 focus:ring-rose-500"
                    : "text-emerald-700 border-slate-200 focus:ring-emerald-500"
                }`}
              />
            </div>

            {/* Status Stamp Indicator */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-100">
              <div>
                <p className="text-[11px] text-slate-500 font-medium">Balance Due:</p>
                <p className={`text-base font-bold ${remainingDues > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                  {formatINR(remainingDues)}
                </p>
              </div>
              <div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                    currentPaymentStatus === "PAID"
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                      : currentPaymentStatus === "PARTIAL"
                      ? "bg-amber-100 text-amber-800 border border-amber-300"
                      : "bg-rose-100 text-rose-800 border border-rose-300"
                  }`}
                >
                  {currentPaymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Submit Action Buttons */}
          <div className="pt-4 space-y-2">
            <button
              type="button"
              disabled={submitting}
              onClick={() => handleSubmitBill(true)}
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              <Printer className="h-4 w-4" />
              <span>{submitting ? "Processing..." : "Complete Bill & Print (A4)"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
