"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Calendar,
  Download,
  Printer,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Clock,
  Skull,
  DollarSign,
  FileSpreadsheet,
} from "lucide-react";
import { formatINR, formatDate, formatDateTime } from "@/lib/utils";
import { useLiveRefresh } from "@/lib/useLiveRefresh";

function ReportsContent() {
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") || "daily";

  const [reportType, setReportType] = useState(initialType);
  const [startDate, setStartDate] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0]
  );
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchReport = (silent = false) => {
    if (!silent) setLoading(true);
    fetch(`/api/reports?type=${reportType}&startDate=${startDate}&endDate=${endDate}`, { cache: "no-store" })
      .then((res) => res.json())
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchReport();
  }, [reportType]);
  useLiveRefresh(() => fetchReport(true));

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    if (!data) return;
    let csvContent = "data:text/csv;charset=utf-8,";

    if (reportType === "daily" || reportType === "monthly") {
      csvContent += "Invoice Number,Date,Patient,Doctor,Grand Total,Paid,Due,Status\n";
      data.invoices?.forEach((inv: any) => {
        csvContent += `"${inv.invoiceNumber}","${formatDate(inv.invoiceDate)}","${inv.patientName}","${inv.doctorName || ""}","${inv.grandTotal}","${inv.paidAmount}","${inv.remainingAmount}","${inv.paymentStatus}"\n`;
      });
    } else if (reportType === "gst") {
      csvContent += "Invoice Number,Date,Taxable Amount,CGST,SGST,Total GST,Grand Total\n";
      data.invoices?.forEach((inv: any) => {
        csvContent += `"${inv.invoiceNumber}","${formatDate(inv.invoiceDate)}","${inv.taxableAmount}","${inv.cgstAmount}","${inv.sgstAmount}","${inv.totalGstAmount}","${inv.grandTotal}"\n`;
      });
    } else if (reportType === "profit") {
      csvContent += "Invoice,Date,Medicine,Qty,Unit Purchase,Unit Selling,Cost,Revenue,Profit\n";
      data.items?.forEach((i: any) => {
        csvContent += `"${i.invoiceNumber}","${formatDate(i.date)}","${i.medicineName}","${i.quantity}","${i.purchasePrice}","${i.sellingPrice}","${i.totalCost}","${i.totalRevenue}","${i.profit}"\n`;
      });
    } else if (reportType === "low-stock") {
      csvContent += "Medicine,Company,Pack,Current Stock,Min Level,Deficit\n";
      data.items?.forEach((i: any) => {
        csvContent += `"${i.name}","${i.company}","${i.packSize}","${i.currentStock}","${i.minStockLevel}","${i.deficit}"\n`;
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Report_${reportType}_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner (Hidden in Print) */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pharmacy Business & Tax Reports</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            GST returns, daily collections, profit margin analysis, expiry alerts & audits
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={exportCSV}
            className="p-2.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-all"
          >
            <Printer className="h-4 w-4" />
            <span>Print Report</span>
          </button>
        </div>
      </div>

      {/* Report Types Tabs (Hidden in Print) */}
      <div className="no-print bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap gap-1.5">
        {[
          { id: "daily", label: "Daily Sales" },
          { id: "monthly", label: "Monthly Summary" },
          { id: "gst", label: "GST Summary Report" },
          { id: "profit", label: "Profit & Loss" },
          { id: "expiry", label: "Expiry Stock Audit" },
          { id: "low-stock", label: "Low Stock Alert" },
          { id: "customer-dues", label: "Customer Dues (Udhaar)" },
          { id: "purchase", label: "Purchase Report" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold transition-colors ${
              reportType === tab.id
                ? "bg-blue-600 text-white shadow-xs"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Date Filter Bar (Hidden in Print) */}
      <div className="no-print bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>From:</span>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-medium">
            <span>To:</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800"
            />
          </div>
          <button
            onClick={() => fetchReport()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg"
          >
            Apply Dates
          </button>
        </div>

        <button
          onClick={() => fetchReport()}
          className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Content Rendering based on Report Type */}
      {loading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-blue-600" />
          <span>Compiling report figures...</span>
        </div>
      ) : !data ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">
          No data available for selected filter.
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. Daily / Monthly Sales Report */}
          {(reportType === "daily" || reportType === "monthly") && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Total Billed Revenue</span>
                  <h3 className="text-2xl font-bold text-slate-900 mt-1">{formatINR(data.totalSales || 0)}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">{data.invoiceCount || 0} invoices generated</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Amount Received</span>
                  <h3 className="text-2xl font-bold text-emerald-700 mt-1">{formatINR(data.totalPaid || 0)}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Cash, UPI & Card Collections</p>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Pending Receivables</span>
                  <h3 className="text-2xl font-bold text-rose-600 mt-1">{formatINR(data.totalRemaining || 0)}</h3>
                  <p className="text-[11px] text-slate-400 mt-1">Unpaid / Partial dues</p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Invoice #</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4">Patient / Customer</th>
                        <th className="py-2.5 px-4 text-right">Taxable</th>
                        <th className="py-2.5 px-4 text-right">GST</th>
                        <th className="py-2.5 px-4 text-right">Total</th>
                        <th className="py-2.5 px-4 text-right">Paid</th>
                        <th className="py-2.5 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.invoices?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-4 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                          <td className="py-2.5 px-4 font-medium text-slate-800">{inv.patientName}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">₹{inv.taxableAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">₹{inv.totalGstAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatINR(inv.grandTotal)}</td>
                          <td className="py-2.5 px-4 text-right font-semibold text-emerald-700">₹{inv.paidAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                inv.paymentStatus === "PAID"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-rose-100 text-rose-800"
                              }`}
                            >
                              {inv.paymentStatus}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 2. GST Summary Report */}
          {reportType === "gst" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Total Taxable Turnover</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{formatINR(data.totalTaxable || 0)}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">CGST (Central Tax)</span>
                  <h3 className="text-xl font-bold text-blue-700 mt-1">{formatINR(data.totalCgst || 0)}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">SGST (State Tax)</span>
                  <h3 className="text-xl font-bold text-indigo-700 mt-1">{formatINR(data.totalSgst || 0)}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Total GST Liability</span>
                  <h3 className="text-xl font-bold text-purple-700 mt-1">{formatINR(data.totalGst || 0)}</h3>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Invoice #</th>
                        <th className="py-2.5 px-4">Date</th>
                        <th className="py-2.5 px-4 text-right">Taxable Value</th>
                        <th className="py-2.5 px-4 text-right">CGST</th>
                        <th className="py-2.5 px-4 text-right">SGST</th>
                        <th className="py-2.5 px-4 text-right">Total GST</th>
                        <th className="py-2.5 px-4 text-right">Invoice Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.invoices?.map((inv: any) => (
                        <tr key={inv.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-bold text-blue-600">{inv.invoiceNumber}</td>
                          <td className="py-2.5 px-4 text-slate-600">{formatDate(inv.invoiceDate)}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-800">₹{inv.taxableAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700">₹{inv.cgstAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700">₹{inv.sgstAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-blue-700">₹{inv.totalGstAmount.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900">{formatINR(inv.grandTotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 3. Profit & Loss Report */}
          {reportType === "profit" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Gross Sales Revenue</span>
                  <h3 className="text-xl font-bold text-slate-900 mt-1">{formatINR(data.totalRevenue || 0)}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Cost of Goods Sold (COGS)</span>
                  <h3 className="text-xl font-bold text-slate-700 mt-1">{formatINR(data.totalCost || 0)}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Gross Profit</span>
                  <h3 className="text-xl font-bold text-emerald-700 mt-1">{formatINR(data.grossProfit || 0)}</h3>
                </div>
                <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                  <span className="text-xs font-medium text-slate-500">Profit Margin</span>
                  <h3 className="text-xl font-bold text-emerald-800 mt-1">{data.profitMargin || 0}%</h3>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Invoice #</th>
                        <th className="py-2.5 px-4">Medicine Name</th>
                        <th className="py-2.5 px-4 text-center">Qty</th>
                        <th className="py-2.5 px-4 text-right">Unit Purchase</th>
                        <th className="py-2.5 px-4 text-right">Selling Rate</th>
                        <th className="py-2.5 px-4 text-right">Cost (₹)</th>
                        <th className="py-2.5 px-4 text-right">Revenue (₹)</th>
                        <th className="py-2.5 px-4 text-right font-bold">Gross Profit (₹)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.items?.map((item: any) => (
                        <tr key={item.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-mono font-medium text-blue-600">{item.invoiceNumber}</td>
                          <td className="py-2.5 px-4 font-bold text-slate-800">{item.medicineName}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-700">{item.quantity}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">₹{item.purchasePrice.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700">₹{item.sellingPrice.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right text-slate-600">₹{item.totalCost.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-800">₹{item.totalRevenue.toFixed(2)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-emerald-700">₹{item.profit.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. Expiry Audit Report */}
          {reportType === "expiry" && (
            <div className="space-y-6">
              {/* Expired Stock */}
              <div className="bg-white rounded-xl border border-rose-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-rose-50 border-b border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-xs uppercase tracking-wider">
                    <Skull className="h-4 w-4 text-rose-600" />
                    <span>Expired Stock (Locked from Sale) - {data.expired?.length || 0} Batches</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Medicine</th>
                        <th className="py-2.5 px-4">Company</th>
                        <th className="py-2.5 px-4">Batch Number</th>
                        <th className="py-2.5 px-4">Expiry Date</th>
                        <th className="py-2.5 px-4 text-center">Quantity</th>
                        <th className="py-2.5 px-4 text-right">Loss Valuation (Purchase Cost)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.expired?.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-slate-400">
                            No expired stock in inventory!
                          </td>
                        </tr>
                      ) : (
                        data.expired?.map((b: any) => (
                          <tr key={b.id} className="hover:bg-rose-50/40">
                            <td className="py-2.5 px-4 font-bold text-slate-900">{b.medicineName}</td>
                            <td className="py-2.5 px-4 text-slate-600">{b.company}</td>
                            <td className="py-2.5 px-4 font-mono font-bold text-rose-700">{b.batchNumber}</td>
                            <td className="py-2.5 px-4 font-mono text-rose-700">{formatDate(b.expiryDate)}</td>
                            <td className="py-2.5 px-4 text-center font-bold text-slate-800">{b.quantity}</td>
                            <td className="py-2.5 px-4 text-right font-bold text-rose-700">
                              {formatINR(b.lossValue)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Expiring in 90 Days */}
              <div className="bg-white rounded-xl border border-amber-200 shadow-xs overflow-hidden">
                <div className="p-4 bg-amber-50 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-amber-800 font-bold text-xs uppercase tracking-wider">
                    <Clock className="h-4 w-4 text-amber-600" />
                    <span>Expiring within 90 Days - {data.expiringIn90?.length || 0} Batches</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Medicine</th>
                        <th className="py-2.5 px-4">Company</th>
                        <th className="py-2.5 px-4">Batch Number</th>
                        <th className="py-2.5 px-4">Expiry Date</th>
                        <th className="py-2.5 px-4 text-center">Quantity</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.expiringIn90?.map((b: any) => (
                        <tr key={b.id} className="hover:bg-amber-50/40">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{b.medicineName}</td>
                          <td className="py-2.5 px-4 text-slate-600">{b.company}</td>
                          <td className="py-2.5 px-4 font-mono font-bold text-amber-800">{b.batchNumber}</td>
                          <td className="py-2.5 px-4 font-mono text-amber-800">{formatDate(b.expiryDate)}</td>
                          <td className="py-2.5 px-4 text-center font-bold text-slate-800">{b.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. Low Stock Report */}
          {reportType === "low-stock" && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-xs uppercase tracking-wider">
                  Medicines Below Minimum Threshold ({data.items?.length || 0})
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-4">Medicine Name</th>
                      <th className="py-2.5 px-4">Company</th>
                      <th className="py-2.5 px-4">Pack Size</th>
                      <th className="py-2.5 px-4 text-center">Active Quantity</th>
                      <th className="py-2.5 px-4 text-center">Min Threshold</th>
                      <th className="py-2.5 px-4 text-center">Deficit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.items?.map((item: any) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-4 font-bold text-slate-900">{item.name}</td>
                        <td className="py-2.5 px-4 text-slate-600">{item.company}</td>
                        <td className="py-2.5 px-4 text-slate-700">{item.packSize}</td>
                        <td className="py-2.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded font-bold bg-rose-100 text-rose-700">
                            {item.currentStock}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-center text-slate-600">{item.minStockLevel}</td>
                        <td className="py-2.5 px-4 text-center font-bold text-rose-600">
                          -{item.deficit} pcs
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 6. Customer Dues Report */}
          {reportType === "customer-dues" && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-xs font-medium text-slate-500">Total Outstanding Balance (Market Dues)</span>
                <h3 className="text-2xl font-bold text-rose-600 mt-1">{formatINR(data.totalDues || 0)}</h3>
                <p className="text-[11px] text-slate-400 mt-1">{data.customerCount || 0} customers with unpaid balances</p>
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-4">Customer Name</th>
                        <th className="py-2.5 px-4">Mobile</th>
                        <th className="py-2.5 px-4">Address</th>
                        <th className="py-2.5 px-4 text-right">Total Purchases</th>
                        <th className="py-2.5 px-4 text-right">Total Paid</th>
                        <th className="py-2.5 px-4 text-right font-bold text-rose-600">Pending Due (Udhaar)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.customers?.map((c: any) => (
                        <tr key={c.id} className="hover:bg-slate-50">
                          <td className="py-2.5 px-4 font-bold text-slate-900">{c.name}</td>
                          <td className="py-2.5 px-4 font-mono font-medium text-slate-700">{c.mobile}</td>
                          <td className="py-2.5 px-4 text-slate-600">{c.address || "-"}</td>
                          <td className="py-2.5 px-4 text-right text-slate-700">{formatINR(c.totalPurchases)}</td>
                          <td className="py-2.5 px-4 text-right text-emerald-700 font-medium">{formatINR(c.totalPaid)}</td>
                          <td className="py-2.5 px-4 text-right font-bold text-rose-600">{formatINR(c.balanceDue)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
            <span>Loading reports...</span>
          </div>
        </div>
      }
    >
      <ReportsContent />
    </Suspense>
  );
}
