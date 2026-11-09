'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { CustomerHeader } from '@/components/customer/CustomerHeader';
import { CustomerFooter } from '@/components/customer/CustomerFooter';
import { deviceApi } from '@/lib/api/deviceApi';
import { DeviceRecord, DeviceListResponse } from '@/lib/api/types';
import { useAuth } from '@/context/AuthContext';
import {
  Laptop,
  Smartphone,
  Globe,
  Trash2,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  PlusCircle,
  Clock,
  CheckCircle2,
} from 'lucide-react';

export default function DeviceManagementPage() {
  const { isAuthenticated, user, isLoading: isAuthLoading } = useAuth();
  const [data, setData] = useState<DeviceListResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [deviceToRemove, setDeviceToRemove] = useState<DeviceRecord | null>(null);
  const [isRemoving, setIsRemoving] = useState<boolean>(false);

  const fetchDevices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await deviceApi.listDevices();
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load registered devices';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDevices();
    } else if (!isAuthLoading) {
      setIsLoading(false);
    }
  }, [isAuthenticated, isAuthLoading, fetchDevices]);

  const handleConfirmRemove = async () => {
    if (!deviceToRemove) return;
    setIsRemoving(true);
    try {
      await deviceApi.removeDevice(deviceToRemove.id);
      setDeviceToRemove(null);
      await fetchDevices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to remove device';
      setError(msg);
    } finally {
      setIsRemoving(false);
    }
  };

  const getDeviceIcon = (type: string) => {
    const lower = type.toLowerCase();
    if (lower.includes('phone') || lower.includes('mobile')) return <Smartphone className="w-5 h-5 text-emerald-400" />;
    if (lower.includes('desk') || lower.includes('mac') || lower.includes('pc')) return <Laptop className="w-5 h-5 text-blue-400" />;
    return <Globe className="w-5 h-5 text-purple-400" />;
  };

  return (
    <div className="min-h-screen bg-[#08090C] text-[#F5F5F5] flex flex-col font-sans selection:bg-[#E50914] selection:text-white">
      <CustomerHeader />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-28 pb-16 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#262932] pb-6">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Registered Devices
            </h1>
            <p className="text-xs font-mono text-gray-400">
              Manage devices authorized for cinema streaming and offline downloads (POD-07 Resolution).
            </p>
          </div>
          <Link
            href="/account/security"
            className="self-start sm:self-auto px-4 py-2 rounded-xl bg-[#181A21] hover:bg-[#262932] border border-[#262932] text-xs font-mono text-gray-300 transition-colors"
          >
            Account Security →
          </Link>
        </div>

        {!isAuthenticated && !isAuthLoading && (
          <div className="p-8 rounded-3xl bg-[#111318] border border-[#262932] text-center space-y-4">
            <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto" />
            <h3 className="text-base font-bold text-white">Sign In Required</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              You must be signed in to inspect or deregister your authorized viewing devices.
            </p>
            <Link
              href="/login?returnTo=/account/devices"
              className="inline-flex px-6 py-2.5 rounded-xl bg-[#E50914] text-white font-bold text-xs"
            >
              Sign In Now
            </Link>
          </div>
        )}

        {isAuthenticated && (
          <>
            {/* Device Capacity Summary Card */}
            <div className="p-6 rounded-3xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 shadow-xl">
              <div className="space-y-2">
                <span className="text-[10px] font-mono text-[#D6A84F] uppercase tracking-wider font-bold">
                  Effective Device Limit (POD-07)
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black text-white font-mono">
                    {data?.currentCount ?? 0}
                  </span>
                  <span className="text-sm text-gray-500 font-mono">
                    / {data?.effectiveLimit ?? 2} slots used
                  </span>
                </div>
                <p className="text-xs text-gray-400 max-w-md">
                  Default limit is 2 devices. Active VIP subscription passes automatically unlock additional slots (non-additive).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={fetchDevices}
                  disabled={isLoading}
                  className="p-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-gray-400 hover:text-white transition-colors"
                  title="Refresh device list"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                {error}
              </div>
            )}

            {/* Device List */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
                Authorized Hardware &amp; Browsers
              </h3>

              {isLoading && !data && (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="p-5 rounded-2xl bg-[#111318] border border-[#262932] animate-pulse h-20" />
                  ))}
                </div>
              )}

              {data && data.devices.length === 0 && (
                <div className="p-8 rounded-2xl bg-[#111318] border border-[#262932] text-center text-xs text-gray-500 font-mono">
                  No devices currently registered to your account.
                </div>
              )}

              {data && data.devices.length > 0 && (
                <div className="rounded-3xl bg-[#111318] border border-[#262932] divide-y divide-[#262932] overflow-hidden">
                  {data.devices.map((dev) => (
                    <div key={dev.id} className="p-5 sm:p-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-[#181A21] border border-[#262932] flex items-center justify-center shrink-0">
                          {getDeviceIcon(dev.deviceType)}
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-white">{dev.deviceName}</h4>
                            <span className="px-2 py-0.5 rounded bg-[#181A21] border border-[#262932] text-[10px] font-mono text-gray-400 uppercase">
                              {dev.deviceType}
                            </span>
                          </div>
                          <p className="text-[11px] font-mono text-gray-500">
                            Registered: {new Date(dev.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={() => setDeviceToRemove(dev)}
                        className="p-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors flex items-center gap-1.5 text-xs font-semibold"
                        title="Remove device"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span className="hidden sm:inline">Remove</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Removal Confirmation Dialog */}
            {deviceToRemove && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                <div className="w-full max-w-md bg-[#0E1015] border border-[#262932] rounded-3xl p-6 space-y-5 shadow-2xl">
                  <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div className="text-center space-y-2">
                    <h3 className="text-lg font-bold text-white">Remove Device?</h3>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Are you sure you want to remove <strong>{deviceToRemove.deviceName}</strong>?
                    </p>
                    <p className="text-[11px] text-gray-500 leading-relaxed">
                      This action will immediately terminate active sessions on that device and invalidate any offline download authorization tokens saved on it.
                    </p>
                  </div>
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setDeviceToRemove(null)}
                      disabled={isRemoving}
                      className="flex-1 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-xs font-bold text-gray-300 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmRemove}
                      disabled={isRemoving}
                      className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      {isRemoving ? 'Removing...' : 'Confirm Remove'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      <CustomerFooter />
    </div>
  );
}
