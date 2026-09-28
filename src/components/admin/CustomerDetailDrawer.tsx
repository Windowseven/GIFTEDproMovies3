'use client';

import React from "react";
import { X, Crown, Smartphone, Tv, Calendar, Mail, Phone, Clock, AlertTriangle, ShieldCheck, Plus, Ban, CheckCircle2 } from "lucide-react";
import { AdminCustomer } from "@/types/admin";

interface CustomerDetailDrawerProps {
  customer: AdminCustomer | null;
  isOpen: boolean;
  onClose: () => void;
  onToggleStatus: (customer: AdminCustomer) => void;
  onExtendPass: (customer: AdminCustomer, days: number) => void;
  onRevokeDevice: (customer: AdminCustomer, deviceId: string) => void;
}

export const CustomerDetailDrawer: React.FC<CustomerDetailDrawerProps> = ({
  customer,
  isOpen,
  onClose,
  onToggleStatus,
  onExtendPass,
  onRevokeDevice,
}) => {
  if (!isOpen || !customer) return null;

  const isSuspended = customer.status === "suspended";

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
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#111318] to-[#262932] border border-[#262932] flex items-center justify-center font-bold text-sm text-[#D6A84F]">
                {customer.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#F5F5F5]">{customer.name}</h3>
                <span className="text-[11px] text-[#A6A8B0] font-mono">ID: {customer.id}</span>
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
            {/* Account Status Strip */}
            <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-mono tracking-wider text-[#70737C]">Account Status</span>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isSuspended ? "bg-[#DC2626]" : "bg-[#10B981]"}`} />
                  <span className="text-xs font-bold text-[#F5F5F5] capitalize">{customer.status}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onToggleStatus(customer)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  isSuspended
                    ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/25"
                    : "bg-[#DC2626]/15 text-[#DC2626] border border-[#DC2626]/30 hover:bg-[#DC2626]/25"
                }`}
              >
                {isSuspended ? "Reactivate Account" : "Suspend Account"}
              </button>
            </div>

            {/* Customer Details */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#70737C]">Contact Information</h4>
              <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] space-y-2.5 text-xs">
                <div className="flex items-center gap-2.5 text-[#A6A8B0]">
                  <Mail className="w-4 h-4 text-[#70737C]" />
                  <span className="text-[#F5F5F5]">{customer.email}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#A6A8B0]">
                  <Phone className="w-4 h-4 text-[#70737C]" />
                  <span className="text-[#F5F5F5]">{customer.phone}</span>
                </div>
                <div className="flex items-center gap-2.5 text-[#A6A8B0]">
                  <Calendar className="w-4 h-4 text-[#70737C]" />
                  <span>Joined: <strong className="text-[#F5F5F5]">{customer.registeredDateFormatted}</strong></span>
                </div>
                <div className="flex items-center gap-2.5 text-[#A6A8B0]">
                  <Clock className="w-4 h-4 text-[#70737C]" />
                  <span>Last active: <strong className="text-[#F5F5F5]">{customer.lastActiveFormatted}</strong></span>
                </div>
              </div>
            </div>

            {/* Subscription & Entitlements */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#70737C]">VIP Pass & Access</h4>
                {customer.isVip && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D6A84F]/15 text-[#D6A84F] border border-[#D6A84F]/30 flex items-center gap-1">
                    <Crown className="w-3 h-3" /> VIP Active
                  </span>
                )}
              </div>

              <div className="p-4 rounded-xl bg-[#111318] border border-[#262932] space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[#A6A8B0]">Current Pass:</span>
                  <span className="font-bold text-[#F5F5F5]">{customer.activePassName || "No Active Pass"}</span>
                </div>
                {customer.passExpiresAt && (
                  <div className="flex items-center justify-between">
                    <span className="text-[#A6A8B0]">Expiration:</span>
                    <span className="font-mono text-[#D6A84F]">{customer.passExpiresAt}</span>
                  </div>
                )}

                <div className="pt-2 border-t border-[#262932] flex items-center gap-2">
                  <span className="text-[11px] text-[#70737C]">Quick Extension:</span>
                  <button
                    type="button"
                    onClick={() => onExtendPass(customer, 7)}
                    className="px-2.5 py-1 rounded bg-[#181A21] border border-[#262932] text-white hover:border-[#D6A84F]/50 text-[11px] font-semibold transition-colors"
                  >
                    +7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => onExtendPass(customer, 30)}
                    className="px-2.5 py-1 rounded bg-[#181A21] border border-[#262932] text-white hover:border-[#D6A84F]/50 text-[11px] font-semibold transition-colors"
                  >
                    +30 Days
                  </button>
                </div>
              </div>
            </div>

            {/* Registered Devices (Without Raw IPs) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#70737C]">
                  Active Devices ({customer.devices?.length || 0}/3)
                </h4>
              </div>

              <div className="space-y-2">
                {customer.devices && customer.devices.length > 0 ? (
                  customer.devices.map((dev) => (
                    <div
                      key={dev.id}
                      className="p-3 rounded-xl bg-[#111318] border border-[#262932] flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2.5">
                        {dev.deviceType === "tv" ? (
                          <Tv className="w-4 h-4 text-[#D6A84F]" />
                        ) : (
                          <Smartphone className="w-4 h-4 text-[#3B82F6]" />
                        )}
                        <div>
                          <p className="font-semibold text-white">{dev.deviceName}</p>
                          <p className="text-[10px] text-[#70737C] font-mono">Last active: {dev.lastActive}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onRevokeDevice(customer, dev.id)}
                        className="text-[11px] text-[#DC2626] hover:underline"
                      >
                        Revoke
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-[#70737C] italic">No active devices registered.</p>
                )}
              </div>
            </div>

            {/* Commercial Summary */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold font-mono uppercase tracking-wider text-[#70737C]">Commerce Summary</h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-[#111318] border border-[#262932]">
                  <span className="text-[10px] font-mono uppercase text-[#70737C]">Total Spent</span>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    TZS {customer.totalSpentTsh.toLocaleString()}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#111318] border border-[#262932]">
                  <span className="text-[10px] font-mono uppercase text-[#70737C]">Orders Placed</span>
                  <div className="text-base font-bold font-mono text-white mt-1">
                    {customer.ordersCount || customer.moviesPurchasedCount || 0}
                  </div>
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
              Close Drawer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
