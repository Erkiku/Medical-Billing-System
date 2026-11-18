"use client";

import { useEffect, useState, use } from "react";
import Link from "next/link";
import {
  Printer,
  ArrowLeft,
  MessageSquare,
  Share2,
  CheckCircle,
  FileDown,
  Building,
  Phone,
  Calendar,
} from "lucide-react";
import { formatINR, numberToIndianWords, formatDate, formatDateTime } from "@/lib/utils";
import { useStore } from "@/context/StoreContext";

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const { storeInfo } = useStore();
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/invoices/${resolvedParams.id}`)
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, [resolvedParams.id]);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsApp = async () => {
    if (!data?.invoice) return;
    try {
      const res = await fetch("/api/notifications/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: data.invoice.id, channel: "WHATSAPP" }),
      });
      const d = await res.json();
      if (d.whatsappUrl) {
        window.open(d.whatsappUrl, "_blank");
      }
    } catch {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <p className="text-slate-500 text-sm">Loading A4 Invoice...</p>
      </div>
    );
  }

  if (!data?.invoice) {
    return (
      <div className="text-center py-16">
        <h2 className="text-lg font-bold text-slate-800">Invoice not found</h2>
        <Link href="/invoices" className="text-blue-600 text-sm hover:underline mt-2 inline-block">
          &larr; Back to Invoices
        </Link>
      </div>
    );
  }

  const { invoice, store } = data;
  const currentStore = (store && store.storeName) ? store : (storeInfo || store);
  const isPaid = invoice.paymentStatus === "PAID";
  const isUnpaid = invoice.paymentStatus === "UNPAID";
  const isPartial = invoice.paymentStatus === "PARTIAL";

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Action Header (Hidden in Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <Link
          href="/invoices"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Invoices List</span>
        </Link>

        <div className="flex items-center gap-2">
          {invoice.remainingAmount > 0 && (
            <button
              onClick={handleWhatsApp}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Send WhatsApp Reminder</span>
            </button>
          )}

          <button
            onClick={handlePrint}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-xs transition-all active:scale-[0.98]"
          >
            <Printer className="h-4 w-4" />
            <span>Print A4 Invoice</span>
          </button>
        </div>
      </div>

      {/* A4 Printable Invoice Sheet */}
      <div className="invoice-container bg-white rounded-xl border border-slate-300 shadow-lg p-8 sm:p-10 relative overflow-hidden text-slate-900 text-xs">
        {/* Status Stamp Watermark / Stamp in top right corner */}
        <div className="absolute right-8 top-8 transform rotate-12 pointer-events-none select-none">
          {isPaid && (
            <div className="stamp-paid border-4 border-emerald-600 text-emerald-600 px-6 py-2 rounded-xl font-black text-2xl uppercase tracking-widest opacity-85 shadow-xs">
              PAID
            </div>
          )}
          {isUnpaid && (
            <div className="stamp-unpaid border-4 border-rose-600 text-rose-600 px-6 py-2 rounded-xl font-black text-2xl uppercase tracking-widest opacity-85 shadow-xs">
              UNPAID
            </div>
          )}
          {isPartial && (
            <div className="stamp-partial border-4 border-amber-600 text-amber-600 px-4 py-2 rounded-xl font-black text-xl uppercase tracking-wider opacity-85 shadow-xs">
              PARTIALLY PAID
            </div>
          )}
        </div>

        {/* 1. Store Header */}
        <div className="border-b-2 border-slate-900 pb-4 text-center">
          <h1 className="text-2xl font-black tracking-tight uppercase text-slate-900">
            {currentStore?.storeName || "R & A MEDICAL STORE"}
          </h1>
          <p className="text-xs font-medium text-slate-600 mt-0.5">
            {currentStore?.tagline || "Retail & Wholesale Chemists • Complete Healthcare"}
          </p>
          <p className="text-xs text-slate-700 mt-1">
            {currentStore?.address}, {currentStore?.city}, {currentStore?.state} - {currentStore?.pincode}
          </p>
          <p className="text-xs text-slate-700">Phone: {currentStore?.phone} | Email: {currentStore?.email}</p>

          <div className="mt-2 pt-2 border-t border-slate-200 flex flex-wrap justify-center gap-x-6 gap-y-1 text-[11px] font-semibold text-slate-700">
            <span>GSTIN: {currentStore?.gstin || "07AAAAA0000A1Z5"}</span>
            <span>D.L. No: {currentStore?.dlNumber1 || "DL-20B-123456"} / {currentStore?.dlNumber2 || "DL-21B-654321"}</span>
            {currentStore?.fssaiNumber && <span>FSSAI: {currentStore.fssaiNumber}</span>}
          </div>
        </div>

        {/* 2. Tax Invoice Title & Bill Metadata */}
        <div className="py-2.5 border-b border-slate-300 flex justify-between items-center text-[11px] font-bold uppercase tracking-wider bg-slate-50 px-3 -mx-8 sm:-mx-10 my-0">
          <span>RETAIL TAX INVOICE (CASH / CREDIT MEMO)</span>
          <span>ORIGINAL FOR RECIPIENT</span>
        </div>

        <div className="grid grid-cols-2 gap-6 py-4 border-b border-slate-200">
          {/* Patient Details */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Patient / Billed To:
            </span>
            <p className="text-sm font-bold text-slate-900">{invoice.patientName}</p>
            {invoice.patientMobile && (
              <p className="text-slate-600 font-mono">Mobile: {invoice.patientMobile}</p>
            )}
            {invoice.patientAddress && (
              <p className="text-slate-600">{invoice.patientAddress}</p>
            )}
          </div>

          {/* Invoice Meta & Doctor */}
          <div className="space-y-1 text-right">
            <div>
              <span className="text-slate-500 font-medium">Invoice No: </span>
              <span className="font-bold text-slate-900 font-mono text-sm">{invoice.invoiceNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 font-medium">Date & Time: </span>
              <span className="font-semibold text-slate-800">{formatDateTime(invoice.invoiceDate)}</span>
            </div>
            {invoice.doctorName && (
              <div>
                <span className="text-slate-500 font-medium">Prescribed By: </span>
                <span className="font-semibold text-slate-800">{invoice.doctorName}</span>
              </div>
            )}
            <div>
              <span className="text-slate-500 font-medium">Payment Mode: </span>
              <span className="font-semibold text-slate-800">
                {invoice.paymentMethod === "UNPAID"
                  ? "UNPAID (Credit / Udhaar)"
                  : invoice.paymentMethod}
              </span>
            </div>
          </div>
        </div>

        {/* 3. Medicines Items Table */}
        <div className="py-4 overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-300 table-auto whitespace-nowrap invoice-table">
            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-300">
              <tr>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center whitespace-nowrap">S.No</th>
                <th className="py-2 px-3 border-r border-slate-300 whitespace-nowrap">Product / Medicine Description</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center whitespace-nowrap">Batch</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center whitespace-nowrap">Pack</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center whitespace-nowrap">Expiry</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right whitespace-nowrap">MRP</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right whitespace-nowrap">Rate</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-center whitespace-nowrap">Qty</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right whitespace-nowrap">Disc%</th>
                <th className="py-2 px-2.5 border-r border-slate-300 text-right whitespace-nowrap">GST%</th>
                <th className="py-2 px-3 text-right whitespace-nowrap">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item: any, idx: number) => (
                <tr key={item.id} className="leading-tight">
                  <td className="py-2 px-2.5 border-r border-slate-300 text-center text-slate-500 whitespace-nowrap">
                    {idx + 1}
                  </td>
                  <td className="py-2 px-3 border-r border-slate-300 font-semibold text-slate-900 whitespace-nowrap">
                    <span className="inline-block whitespace-nowrap">{item.medicine?.name || "Medicine"}</span>
                    <span className="block text-[10px] text-slate-500 font-normal whitespace-nowrap">
                      Mfg: {item.medicine?.company}
                    </span>
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono font-medium whitespace-nowrap">
                    {item.batch?.batchNumber || "-"}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-center text-slate-600 whitespace-nowrap">
                    {item.pack}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-center font-mono whitespace-nowrap">
                    {formatDate(item.expiryDate)}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-right text-slate-600 whitespace-nowrap">
                    {item.mrp.toFixed(2)}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-right font-medium whitespace-nowrap">
                    {item.unitPrice.toFixed(2)}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-center font-bold whitespace-nowrap">
                    {item.quantity}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-right text-slate-600 whitespace-nowrap">
                    {item.discount > 0 ? `${item.discount}%` : "-"}
                  </td>
                  <td className="py-2 px-2.5 border-r border-slate-300 text-right text-slate-600 whitespace-nowrap">
                    {item.gstRate}%
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                    {item.amount.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 4. Financial Totals & Tax Breakdown */}
        <div className="grid grid-cols-2 gap-6 pt-2 border-t border-slate-200">
          {/* Left Column: Amount in Words & Terms */}
          <div className="space-y-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Amount in Words:
              </span>
              <p className="font-bold text-slate-900 italic text-xs mt-0.5">
                {numberToIndianWords(invoice.grandTotal)}
              </p>
            </div>

            {/* GST Summary Table */}
            <div className="border border-slate-200 rounded p-2 text-[11px] bg-slate-50 space-y-1">
              <p className="font-bold text-slate-700">Tax Summary (GST):</p>
              <div className="grid grid-cols-3 gap-2 text-slate-600">
                <div>Taxable: ₹{invoice.taxableAmount.toFixed(2)}</div>
                <div>CGST: ₹{invoice.cgstAmount.toFixed(2)}</div>
                <div>SGST: ₹{invoice.sgstAmount.toFixed(2)}</div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="text-[10px] text-slate-500 leading-normal pt-1">
              <p className="font-semibold text-slate-700">Terms & Conditions:</p>
              <p className="whitespace-pre-line">{store?.terms || "Goods once sold will not be taken back without valid bill."}</p>
            </div>
          </div>

          {/* Right Column: Amount Computations */}
          <div className="space-y-1.5 text-xs text-right">
            <div className="flex justify-between border-b border-slate-100 py-1">
              <span className="text-slate-600">Subtotal:</span>
              <span className="font-semibold">₹{invoice.subtotal.toFixed(2)}</span>
            </div>

            {invoice.discountAmount > 0 && (
              <div className="flex justify-between border-b border-slate-100 py-1 text-emerald-700">
                <span>Special Discount:</span>
                <span>-₹{invoice.discountAmount.toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between border-b border-slate-100 py-1">
              <span className="text-slate-600">Total GST:</span>
              <span className="font-semibold">₹{invoice.totalGstAmount.toFixed(2)}</span>
            </div>

            {invoice.roundOff !== 0 && (
              <div className="flex justify-between border-b border-slate-100 py-1 text-slate-500">
                <span>Round Off:</span>
                <span>{invoice.roundOff >= 0 ? `+₹${invoice.roundOff}` : `-₹${Math.abs(invoice.roundOff)}`}</span>
              </div>
            )}

            <div className="flex justify-between py-2 border-b-2 border-slate-900 text-sm font-black text-slate-900">
              <span>GRAND TOTAL:</span>
              <span className="text-base">{formatINR(invoice.grandTotal)}</span>
            </div>

            <div className="flex justify-between py-1 text-emerald-700 font-bold">
              <span>Amount Received (Paid):</span>
              <span>₹{invoice.paidAmount.toFixed(2)}</span>
            </div>

            <div className="flex justify-between py-1 text-rose-700 font-bold border-t border-slate-200">
              <span>Balance Outstanding Due:</span>
              <span>₹{invoice.remainingAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* 5. Footer: Authorized Signatory */}
        <div className="pt-12 flex justify-between items-end border-t border-slate-200 mt-8">
          <div className="text-[10px] text-slate-400">
            <p>Computer Generated Tax Invoice</p>
            {store?.upiId && <p>Pay online via UPI: {store.upiId}</p>}
          </div>

          <div className="text-center w-56">
            <div className="h-10 border-b border-slate-400 border-dashed mb-1" />
            <p className="font-bold text-slate-800 text-[11px] uppercase">
              For {store?.storeName || "R & A Medical Store"}
            </p>
            <p className="text-[10px] text-slate-500">Authorized Signatory / Pharmacist</p>
          </div>
        </div>
      </div>
    </div>
  );
}

