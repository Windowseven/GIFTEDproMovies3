'use client';

import React, { useState, useEffect } from "react";
import {
  Users,
  Search,
  Filter,
  Crown,
  CheckCircle2,
  AlertTriangle,
  Ban,
  Clock,
  Eye,
  Check,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminCustomer, CustomerStatus } from "@/types/admin";
import { CustomerDetailDrawer } from "@/components/admin/CustomerDetailDrawer";

export default function CustomerManagementPage() {
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [vipFilter, setVipFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadCustomers = async () => {
    const list = await adminRepository.getCustomers({
      vipTier: vipFilter,
      status: statusFilter,
      query: searchQuery,
    });
    setCustomers(list);
  };

  useEffect(() => {
    loadCustomers();
  }, [vipFilter, statusFilter, searchQuery]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleToggleUserStatus = async (customer: AdminCustomer) => {
    const newStatus: CustomerStatus = customer.status === "active" ? "suspended" : "active";
    const updated = await adminRepository.updateCustomerStatus(customer.id, newStatus);
    setSelectedCustomer(updated);
    await loadCustomers();
    showToast(`Customer account for ${customer.name} is now ${newStatus}.`);
  };

  const handleExtendPass = async (customer: AdminCustomer, days: number) => {
    const updated = await adminRepository.extendCustomerPass(customer.id, days);
    setSelectedCustomer(updated);
    await loadCustomers();
    showToast(`Extended access for ${customer.name} by ${days} days.`);
  };

  const handleRevokeDevice = async (customer: AdminCustomer, deviceId: string) => {
    const updated = await adminRepository.revokeCustomerDevice(customer.id, deviceId);
    setSelectedCustomer(updated);
    await loadCustomers();
    showToast(`Device session revoked for ${customer.name}.`);
  };

  const handleOpenDrawer = (customer: AdminCustomer) => {
    setSelectedCustomer(customer);
    setIsDrawerOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#181A21] border border-[#10B981]/40 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[#10B981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Customers
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              {customers.length} Accounts
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Manage registered customers, active subscription passes, device quotas, and account statuses.
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer name, email, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={vipFilter}
            onChange={(e) => setVipFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none"
          >
            <option value="all">All VIP Tiers</option>
            <option value="VIP Ultra">VIP Ultra</option>
            <option value="Weekly Pass">Weekly Pass</option>
            <option value="Daily Pass">Daily Pass</option>
            <option value="Free User">Free User</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
          </select>
        </div>
      </div>

      {/* Customers Table */}
      <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Pass / Tier</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold">Total Spent</th>
                <th className="pb-3 font-semibold">Orders</th>
                <th className="pb-3 font-semibold">Joined Date</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {customers.map((cust) => (
                <tr key={cust.id} className="hover:bg-[#181A21]/50 transition-colors">
                  <td className="py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#181A21] border border-[#262932] flex items-center justify-center font-bold text-xs text-white">
                        {cust.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-white">{cust.name}</p>
                        <p className="text-[11px] text-[#70737C] font-mono">{cust.phone}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5">
                    <div className="flex items-center gap-1.5">
                      {cust.isVip && <Crown className="w-3.5 h-3.5 text-[#D6A84F]" />}
                      <span className={`font-medium ${cust.isVip ? "text-[#D6A84F]" : "text-[#A6A8B0]"}`}>
                        {cust.activePassName || cust.vipTier}
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold capitalize ${
                        cust.status === "active"
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                          : "bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30"
                      }`}
                    >
                      {cust.status}
                    </span>
                  </td>

                  <td className="py-3.5 font-mono font-bold text-white">
                    TZS {cust.totalSpentTsh.toLocaleString()}
                  </td>

                  <td className="py-3.5 font-mono text-white">
                    {cust.ordersCount || cust.moviesPurchasedCount}
                  </td>

                  <td className="py-3.5 text-[#70737C] font-mono">
                    {cust.registeredDateFormatted}
                  </td>

                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenDrawer(cust)}
                      className="px-3 py-1 rounded-xl bg-[#181A21] border border-[#262932] text-xs font-semibold text-white hover:border-[#D6A84F]/40 transition-colors"
                    >
                      View Profile
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Customer Detail Drawer */}
      <CustomerDetailDrawer
        customer={selectedCustomer}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedCustomer(null);
        }}
        onToggleStatus={handleToggleUserStatus}
        onExtendPass={handleExtendPass}
        onRevokeDevice={handleRevokeDevice}
      />
    </div>
  );
}
