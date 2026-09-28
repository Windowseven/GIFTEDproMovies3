'use client';

import React, { useState, useEffect } from "react";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Copy,
  Check,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminPaymentRecord } from "@/types/admin";

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<AdminPaymentRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadPayments = async () => {
    const data = await adminRepository.getPayments({
      status: statusFilter,
      method: methodFilter,
      query: searchQuery,
    });
    setPayments(data);
  };

  useEffect(() => {
    loadPayments();
  }, [statusFilter, methodFilter, searchQuery]);

  const handleCopy = (ref: string) => {
    navigator.clipboard.writeText(ref);
    setCopiedId(ref);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-[#10B981]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Payments Ledger & Verification
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              {payments.length} Transactions
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Review incoming mobile money transfers (M-Pesa, Tigo, Airtel, HaloPesa) and card payments.
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
            placeholder="Search by reference no, order ID, or customer..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none"
          >
            <option value="all">All Payment Methods</option>
            <option value="mpesa">M-Pesa</option>
            <option value="tigo">Tigo Pesa</option>
            <option value="airtel">Airtel Money</option>
            <option value="halopesa">HaloPesa</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="successful">Successful</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                <th className="pb-3 font-semibold">Reference No</th>
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Method</th>
                <th className="pb-3 font-semibold">Amount (TZS)</th>
                <th className="pb-3 font-semibold">Payment Status</th>
                <th className="pb-3 font-semibold">Timestamp</th>
                <th className="pb-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {payments.map((p) => (
                <tr key={p.id} className="hover:bg-[#181A21]/50 transition-colors">
                  <td className="py-3.5 font-mono font-bold text-white">{p.referenceNo}</td>
                  <td className="py-3.5 font-mono text-[#A6A8B0]">{p.orderNumber}</td>
                  <td className="py-3.5">
                    <p className="font-semibold text-white">{p.customerName}</p>
                    <p className="text-[11px] text-[#70737C] font-mono">{p.customerPhoneMasked}</p>
                  </td>
                  <td className="py-3.5 text-[#A6A8B0] font-medium">{p.methodLabel}</td>
                  <td className="py-3.5 font-mono font-bold text-white">
                    TZS {p.amountTsh.toLocaleString()}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold capitalize ${
                        p.status === "successful"
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                          : p.status === "pending"
                          ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                          : "bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30"
                      }`}
                    >
                      {p.statusLabel}
                    </span>
                  </td>
                  <td className="py-3.5 text-[#70737C] font-mono">{p.timestamp}</td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleCopy(p.referenceNo)}
                      className="px-2.5 py-1 rounded bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white text-[11px] font-mono transition-colors"
                    >
                      {copiedId === p.referenceNo ? "Copied" : "Copy Ref"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
