'use client';

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  ReceiptText,
  CreditCard,
  Search,
  Filter,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { TransactionRecord } from "@/types/admin";

export default function TransactionsExplorerPage() {
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");

  const loadTransactions = async () => {
    const list = await adminRepository.getTransactions({
      status: statusFilter,
      query: searchQuery,
    });
    setTransactions(list);
  };

  useEffect(() => {
    loadTransactions();
  }, [statusFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Commercial Transaction Records
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              Unified Ledger
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Comprehensive transactional record of all customer orders and payment confirmations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/orders"
            className="px-3.5 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs font-semibold text-white hover:bg-[#262932] transition-colors flex items-center gap-1.5"
          >
            <span>Orders Feed</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <Link
            href="/admin/payments"
            className="px-3.5 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs font-semibold text-white hover:bg-[#262932] transition-colors flex items-center gap-1.5"
          >
            <span>Payments Ledger</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
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
            placeholder="Search by reference, customer name, or title..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none"
        >
          <option value="all">All Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                <th className="pb-3 font-semibold">Reference</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Content</th>
                <th className="pb-3 font-semibold">Provider</th>
                <th className="pb-3 font-semibold">Amount (TZS)</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {transactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#181A21]/50 transition-colors">
                  <td className="py-3.5 font-mono font-bold text-white">{tx.referenceNo}</td>
                  <td className="py-3.5">
                    <p className="font-semibold text-white">{tx.customerName || "Customer"}</p>
                    <p className="text-[11px] text-[#70737C] font-mono">{tx.customerPhoneMasked}</p>
                  </td>
                  <td className="py-3.5 text-white">{tx.contentTitle}</td>
                  <td className="py-3.5 text-[#A6A8B0]">{tx.providerName}</td>
                  <td className="py-3.5 font-mono font-bold text-white">
                    TZS {tx.amountTsh.toLocaleString()}
                  </td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold capitalize ${
                        tx.status === "completed"
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                          : tx.status === "pending"
                          ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                          : "bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30"
                      }`}
                    >
                      {tx.statusText || tx.status}
                    </span>
                  </td>
                  <td className="py-3.5 text-[#70737C] font-mono text-right">{tx.timestampFormatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
