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
  UserCheck,
  UserPlus,
  Trash2,
  Lock,
  KeyRound,
} from "lucide-react";
import { useStore } from "@/context/StoreContext";

export default function SettingsPage() {
  const { updateStoreInfo } = useStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notificationLogs, setNotificationLogs] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [userSaving, setUserSaving] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    name: "",
    role: "STAFF",
    email: "",
  });
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

  const fetchUsers = () => {
    fetch("/api/users")
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch(() => {});
  };

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

    fetchUsers();
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUser.username || !newUser.password) {
      alert("Username and password are required");
      return;
    }
    setUserSaving(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }
      setShowAddUserModal(false);
      setNewUser({ username: "", password: "", name: "", role: "STAFF", email: "" });
      fetchUsers();
      setSuccessMsg("New user login assigned successfully!");
      setTimeout(() => setSuccessMsg(""), 4000);
    } catch (err: unknown) {
      alert((err as Error).message);
    } finally {
      setUserSaving(false);
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !user.active }),
      });
      if (res.ok) {
        fetchUsers();
      }
    } catch {}
  };

  const handleDeleteUser = async (user: any) => {
    if (user.username === "eduvikku@007") {
      alert("Cannot delete developer primary admin account!");
      return;
    }
    if (!confirm(`Delete login access for user "${user.username || user.name}"?`)) return;
    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (res.ok) {
        fetchUsers();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to delete user");
      }
    } catch {}
  };

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
                type="password"
                value={form.smsApiKey}
                onChange={(e) => setForm({ ...form, smsApiKey: e.target.value })}
                placeholder="Enter provider API secret"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-800"
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

      {/* Staff & Assigned Logins Management */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-2">
              <UserCheck className="h-4 w-4 text-blue-600" />
              <span>Assigned Login Credentials & Access Control</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Only developer-assigned & admin-authorized usernames can sign in to this ERP.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAddUserModal(true)}
            className="py-2 px-3.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Assign New User</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Username</th>
                <th className="py-2.5 px-4">Full Name</th>
                <th className="py-2.5 px-4">Role</th>
                <th className="py-2.5 px-4">Assigned By</th>
                <th className="py-2.5 px-4">Login Status</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    Loading assigned users...
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-600">
                      {u.username || u.email}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-slate-800">{u.name || "-"}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          u.role === "ADMIN"
                            ? "bg-purple-100 text-purple-800"
                            : u.role === "PHARMACIST"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          u.assignedBy === "DEVELOPER"
                            ? "bg-emerald-100 text-emerald-800 font-bold"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.assignedBy || "DEVELOPER"}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <button
                        type="button"
                        onClick={() => handleToggleUserStatus(u)}
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                          u.active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-rose-100 text-rose-700 hover:bg-rose-200"
                        }`}
                        title="Click to toggle access"
                      >
                        {u.active ? "● Active / Allowed" : "○ Disabled"}
                      </button>
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      {u.username !== "eduvikku@007" ? (
                        <button
                          type="button"
                          onClick={() => handleDeleteUser(u)}
                          className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors cursor-pointer"
                          title="Delete assigned access"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-semibold italic">Protected</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-800 mb-1 flex items-center gap-2">
              <UserPlus className="h-4 w-4 text-blue-600" />
              <span>Assign New User Login</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Create an authorized username and password for pharmacy staff to login.
            </p>

            <form onSubmit={handleCreateUser} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Username *</label>
                <input
                  type="text"
                  required
                  value={newUser.username}
                  onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                  placeholder="e.g. rahul_chemist"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Password *</label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  placeholder="Set login password"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Staff Full Name</label>
                <input
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="e.g. Rahul Sharma"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Role / Permissions</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-semibold"
                >
                  <option value="STAFF">STAFF (Billing & Dispensing only)</option>
                  <option value="PHARMACIST">PHARMACIST (Billing, Purchases & Stock)</option>
                  <option value="ADMIN">ADMIN (Full Access & Configuration)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 cursor-pointer font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={userSaving}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {userSaving ? "Assigning..." : "Assign Login Access"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                notificationLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-4 text-slate-600">{new Date(log.createdAt).toLocaleString("en-IN")}</td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-slate-100 text-slate-700">
                        {log.channel}
                      </span>
                    </td>
                    <td className="py-2 px-4 font-mono font-medium text-slate-800">{log.recipient}</td>
                    <td className="py-2 px-4 text-slate-800">{log.customer?.name || "-"}</td>
                    <td className="py-2 px-4 font-mono text-blue-600">{log.invoice?.invoiceNumber || "-"}</td>
                    <td className="py-2 px-4">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          log.status === "SENT"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-blue-100 text-blue-800"
                        }`}
                      >
                        {log.status}
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

