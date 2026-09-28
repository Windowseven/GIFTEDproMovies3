'use client';

import React, { useState, useEffect } from "react";
import {
  ReceiptText,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminOrder } from "@/types/admin";
import { OrderDetailDrawer } from "@/components/admin/OrderDetailDrawer";

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadOrders = async () => {
    const data = await adminRepository.getOrders({
      status: statusFilter,
      type: typeFilter,
      query: searchQuery,
    });
    setOrders(data);
  };

  useEffect(() => {
    loadOrders();
  }, [statusFilter, typeFilter, searchQuery]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ReceiptText className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Customer Orders Feed
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              {orders.length} Records
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Review customer purchases, active pass receipts, and episodic streaming orders.
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
            placeholder="Search by order ID, customer name, or phone..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none"
          >
            <option value="all">All Purchase Types</option>
            <option value="subscription">Subscriptions</option>
            <option value="ppv_stream">PPV Stream</option>
            <option value="ppv_download">PPV Download</option>
            <option value="series_episode">Series Episode</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-[#A6A8B0] focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Completed</option>
            <option value="processing">Processing</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                <th className="pb-3 font-semibold">Order ID</th>
                <th className="pb-3 font-semibold">Customer</th>
                <th className="pb-3 font-semibold">Content / Pass</th>
                <th className="pb-3 font-semibold">Type</th>
                <th className="pb-3 font-semibold">Amount</th>
                <th className="pb-3 font-semibold">Payment Method</th>
                <th className="pb-3 font-semibold">Status</th>
                <th className="pb-3 font-semibold text-right">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]">
              {orders.map((ord) => (
                <tr key={ord.id} className="hover:bg-[#181A21]/50 transition-colors">
                  <td className="py-3.5 font-mono font-bold text-white">{ord.orderNumber}</td>
                  <td className="py-3.5">
                    <p className="font-semibold text-white">{ord.customerName}</p>
                    <p className="text-[11px] text-[#70737C] font-mono">{ord.customerPhoneMasked}</p>
                  </td>
                  <td className="py-3.5 font-medium text-white max-w-[200px] truncate">{ord.itemTitle}</td>
                  <td className="py-3.5">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
                      {ord.purchaseTypeLabel}
                    </span>
                  </td>
                  <td className="py-3.5 font-mono font-bold text-white">
                    TZS {ord.amountTsh.toLocaleString()}
                  </td>
                  <td className="py-3.5 text-[#A6A8B0] font-mono text-[11px]">{ord.paymentMethodLabel}</td>
                  <td className="py-3.5">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-mono font-semibold capitalize ${
                        ord.status === "completed"
                          ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30"
                          : ord.status === "processing"
                          ? "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30"
                          : "bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30"
                      }`}
                    >
                      {ord.statusLabel}
                    </span>
                  </td>
                  <td className="py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedOrder(ord);
                        setIsDrawerOpen(true);
                      }}
                      className="px-2.5 py-1 rounded bg-[#181A21] border border-[#262932] text-white hover:border-[#D6A84F]/40 text-[11px] font-semibold transition-colors"
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <OrderDetailDrawer
        order={selectedOrder}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false);
          setSelectedOrder(null);
        }}
      />
    </div>
  );
}
