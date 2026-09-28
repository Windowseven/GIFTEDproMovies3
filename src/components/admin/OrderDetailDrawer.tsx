'use client';

import React, { useState } from "react";
import { X, ReceiptText, CheckCircle2, Clock, AlertCircle, Copy, Check, ExternalLink } from "lucide-react";
import { AdminOrder } from "@/types/admin";

interface OrderDetailDrawerProps {
  order: AdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OrderDetailDrawer: React.FC<OrderDetailDrawerProps> = ({
  order,
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !order) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isCompleted = order.status === "completed";
  const isPending = order.status === "processing" || order.status === "pending";

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-in fade-in"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#181A21] border-l border-[#262932] shadow-2xl flex flex-col justify-between">
          {/* Header */}
          <div className="p-5 border-b border-[#262932] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#111318] border border-[#262932] flex items-center justify-center text-[#D6A84F]">
                <ReceiptText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F5F5]">{order.orderNumber}</h3>
                <span className="text-[11px] text-[#A6A8B0] font-mono">Receipt & Entitlement</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#70737C] hover:text-white hover:bg-[#111318] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5 scrollbar-thin">
            {/* Status Strip */}
            <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#70737C]">Order Status</span>
                <div className="flex items-center gap-2 mt-0.5">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  ) : isPending ? (
                    <Clock className="w-4 h-4 text-[#F59E0B]" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-[#DC2626]" />
                  )}
                  <span className="text-sm font-bold text-white capitalize">{order.statusLabel}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-xs font-mono text-[#A6A8B0] hover:text-white transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied" : "Copy ID"}</span>
              </button>
            </div>

            {/* Financial Amount */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#111318] to-[#181A21] border border-[#262932] text-center space-y-1">
              <span className="text-[10px] font-mono uppercase text-[#70737C] tracking-wider">Gross Transaction Amount</span>
              <div className="text-2xl font-black font-mono text-white">
                TZS {order.amountTsh.toLocaleString()}
              </div>
              <span className="text-xs text-[#10B981] font-medium">Payment Verified</span>
            </div>

            {/* Content Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#70737C]">Purchased Content</h4>
              <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A6A8B0]">Title:</span>
                  <span className="font-bold text-white text-right">{order.itemTitle}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A6A8B0]">Purchase Type:</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#262932] text-white">
                    {order.purchaseTypeLabel}
                  </span>
                </div>
                {order.djName && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#A6A8B0]">DJ / Translator:</span>
                    <span className="text-[#D6A84F] font-semibold">{order.djName}</span>
                  </div>
                )}
                {order.accessExpiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#A6A8B0]">Access Window:</span>
                    <span className="font-mono text-[#10B981]">{order.accessExpiresAt}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Customer Information */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#70737C]">Customer Information</h4>
              <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A6A8B0]">Name:</span>
                  <span className="font-semibold text-white">{order.customerName}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A6A8B0]">Email:</span>
                  <span className="text-white font-mono text-[11px]">{order.customerEmail}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A6A8B0]">Phone:</span>
                  <span className="text-white font-mono">{order.customerPhoneMasked}</span>
                </div>
              </div>
            </div>

            {/* Payment Method Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#70737C]">Payment Method</h4>
              <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A6A8B0]">Method:</span>
                  <span className="font-semibold text-white">{order.paymentMethodLabel}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#A6A8B0]">Created:</span>
                  <span className="text-[#A6A8B0]">{order.createdAt}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-[#262932] bg-[#111318] flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs font-semibold text-white hover:bg-[#262932] transition-colors"
            >
              Close Receipt
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
