"use client";

import { useEffect, useState } from "react";
import {
  Settings,
  Store,
  ShieldCheck,
  MessageSquare,
  Save,
  RefreshCw,
  CheckCircle,
  FileText,
  CreditCard,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";

export default function SettingsPage() {
  const { updateStoreInfo } = useStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [form, setForm] = useState({
    storeName: "",
    tagline: "",
    address: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    email: "",
    gstin: "",
    dlNumber1: "",
    dlNumber2: "",
    fssaiNumber: "",
    terms: "",
    upiId: "",
    smsGateway: "MOCK",
    smsApiKey: "",
    whatsappToken: "",
    whatsappPhoneId: "",
  });
  const [successMsg, setSuccessMsg] = useState("");

  const fetchSettings = () => {
    setLoading(true);
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.storeName) updateStoreInfo(data);
          setForm({
            storeName: data.storeName || "",
            tagline: data.tagline || "",
            address: data.address || "",
            city: data.city || "",
            state: data.state || "",
            pincode: data.pincode || "",
            phone: data.phone || "",
            email: data.email || "",
            gstin: data.gstin || "",
            dlNumber1: data.dlNumber1 || "",
            dlNumber2: data.dlNumber2 || "",
            fssaiNumber: data.fssaiNumber || "",
            terms: data.terms || "",
            upiId: data.upiId || "",
            smsGateway: data.smsGateway || "MOCK",
            smsApiKey: data.smsApiKey || "",
            whatsappToken: data.whatsappToken || "",
            whatsappPhoneId: data.whatsappPhoneId || "",
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));

    fetch("/api/notifications/remind")
      .then((res) => res.json())
      .then((logs) => setNotificationLogs(Array.isArray(logs) ? logs : []))
      .catch(() => setNotificationLogs([]));
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg("");

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        throw new Error("Failed to save store settings");
      }

      const updatedData = await res.json();
      updateStoreInfo(updatedData);

      setSuccessMsg("Settings updated successfully! Changes will reflect on all future A4 printed invoices.");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-5 w-5 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-16">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Pharmacy & Store Configuration</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure GSTIN, Drug License numbers, print invoice terms & SMS/WhatsApp gateway
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle className="h-4 w-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 text-xs">
        {/* Pharmacy Store Identity Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <Store className="h-4 w-4 text-blue-600" />
            <span>Store Profile & Printed Bill Header</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Medical Store Name *</label>
              <input
                type="text"
                required
                value={form.storeName}
                onChange={(e) => setForm({ ...form, storeName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tagline / Subheading</label>
              <input
                type="text"
                value={form.tagline}
                onChange={(e) => setForm({ ...form, tagline: e.target.value })}
                placeholder="Retail & Wholesale Chemists"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Address / Street</label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">PIN Code</label>
              <input
                type="text"
                value={form.pincode}
                onChange={(e) => setForm({ ...form, pincode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Store Phone / Contact *</label>
              <input
                type="text"
                required
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Legal & Drug License Details Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            <span>Drug License & GST Regulatory Numbers</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN (15 Digits) *</label>
              <input
                type="text"
                required
                value={form.gstin}
                onChange={(e) => setForm({ ...form, gstin: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono uppercase"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Drug License (DL No. 20B) *</label>
              <input
                type="text"
                required
                value={form.dlNumber1}
                onChange={(e) => setForm({ ...form, dlNumber1: e.target.value })}
                placeholder="DL-20B-123456"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Drug License (DL No. 21B)</label>
              <input
                type="text"
                value={form.dlNumber2}
                onChange={(e) => setForm({ ...form, dlNumber2: e.target.value })}
                placeholder="DL-21B-654321"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">FSSAI Registration No.</label>
              <input
                type="text"
                value={form.fssaiNumber}
                onChange={(e) => setForm({ ...form, fssaiNumber: e.target.value })}
                placeholder="10012345678901"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">UPI ID for Digital Payments</label>
              <input
                type="text"
                value={form.upiId}
                onChange={(e) => setForm({ ...form, upiId: e.target.value })}
                placeholder="e.g. storename@upi"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Invoice Terms & Conditions (Prints on bottom of A4 Invoice)
            </label>
            <textarea
              rows={3}
              value={form.terms}
              onChange={(e) => setForm({ ...form, terms: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
            />
          </div>
        </div>

        {/* SMS & WhatsApp Gateway Configuration */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
            <MessageSquare className="h-4 w-4 text-emerald-600" />
            <span>SMS & WhatsApp Gateway Integration</span>
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SMS Gateway Provider</label>
              <select
                value={form.smsGateway}
                onChange={(e) => setForm({ ...form, smsGateway: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
              >
                <option value="MOCK">MOCK Adapter (Local Simulation & Testing)</option>
                <option value="MSG91">MSG91 (India DLT Compliant)</option>
                <option value="2FACTOR">2Factor SMS</option>
              </select>
              <p className="text-[11px] text-slate-400 mt-1">
                WhatsApp click-to-chat links (`wa.me`) are always active and work with zero API cost!
              </p>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">SMS Gateway API Key / Auth Key</label>
              <input
                id="smsApiKey"
                name="smsApiKey"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={form.smsApiKey}
                onChange={(e) => setForm({ ...form, smsApiKey: e.target.value })}
                placeholder="Enter provider API secret"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 font-mono text-xs"
              />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-xs flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Save className="h-4 w-4" />
            <span>{saving ? "Saving Changes..." : "Save Settings"}</span>
          </button>
        </div>
      </form>

      {/* Notification Logs Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            SMS & WhatsApp Notification Delivery Logs
          </h3>
          <span className="text-xs text-slate-400">{notificationLogs.length} messages sent</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Channel</th>
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Customer</th>
                <th className="py-2.5 px-4">Bill Ref</th>
                <th className="py-2.5 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!Array.isArray(notificationLogs) || notificationLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No notification logs recorded yet. Reminders sent via invoices will appear here.
                  </td>
                </tr>
              ) : (
                notificationLogs.map((log, idx) => (
                  <tr key={log?.id || idx} className="hover:bg-slate-50">
                    <td className="py-2 px-4 text-slate-600">
                      {log?.createdAt ? new Date(log.createdAt).toLocaleString("en-IN") : "-"}
                    </td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                        {log?.channel || "-"}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-mono font-medium text-slate-800">{log?.recipient || "-"}</td>
                    <td className="py-2 px-4 text-slate-800">{log?.customer?.name || "-"}</td>
                    <td className="py-2 px-4 font-mono text-blue-600">{log?.invoice?.invoiceNumber || "-"}</td>
                    <td className="py-2 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log?.status === "SENT"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {log?.status || "PENDING"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

