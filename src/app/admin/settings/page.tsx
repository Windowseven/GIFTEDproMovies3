'use client';

import React, { useState, useEffect } from "react";
import {
  Settings,
  Save,
  CheckCircle2,
  AlertTriangle,
  Lock,
  Smartphone,
  Globe,
  Coins,
  Shield,
  Check,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminPlatformSettings } from "@/types/admin";

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<AdminPlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Form states
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [supportPhone, setSupportPhone] = useState("");
  const [defaultCurrency, setDefaultCurrency] = useState("TZS");
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [streamPrice, setStreamPrice] = useState(1500);
  const [downloadPrice, setDownloadPrice] = useState(2500);
  const [accessDuration, setAccessDuration] = useState(48);
  const [maxDevices, setMaxDevices] = useState(3);
  const [publishingRequiresApproval, setPublishingRequiresApproval] = useState(true);
  const [allowOfflineDownloads, setAllowOfflineDownloads] = useState(true);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadSettings = async () => {
    try {
      const data = await adminRepository.getPlatformSettings();
      setSettings(data);
      setPlatformName(data.platformName);
      setSupportEmail(data.supportEmail);
      setSupportPhone(data.supportPhone);
      setDefaultCurrency(data.defaultCurrency);
      setMaintenanceMode(data.maintenanceMode);
      setMaintenanceMessage(data.maintenanceMessage);
      setStreamPrice(data.defaultStreamingPriceTsh);
      setDownloadPrice(data.defaultDownloadPriceTsh);
      setAccessDuration(data.defaultAccessDurationHours);
      setMaxDevices(data.maxActiveDevicesPerUser);
      setPublishingRequiresApproval(data.publishingRequiresApproval);
      setAllowOfflineDownloads(data.allowOfflineDownloads);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const updated = await adminRepository.updatePlatformSettings({
        platformName,
        supportEmail,
        supportPhone,
        defaultCurrency,
        maintenanceMode,
        maintenanceMessage,
        defaultStreamingPriceTsh: streamPrice,
        defaultDownloadPriceTsh: downloadPrice,
        defaultAccessDurationHours: accessDuration,
        maxActiveDevicesPerUser: maxDevices,
        publishingRequiresApproval,
        allowOfflineDownloads,
      });
      setSettings(updated);
      showToast("Platform configuration updated successfully.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Toast */}
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
            <Settings className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Platform & Business Settings
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              Global Policy
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Configure platform branding defaults, content pricing baselines, device rules, and publishing approval workflows.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="px-4 py-2.5 rounded-xl bg-[#B11226] text-white font-semibold text-xs hover:bg-[#B11226]/90 transition-colors flex items-center gap-2 shadow-md shadow-[#B11226]/20 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save Changes"}</span>
        </button>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6 text-xs">
        {/* General Platform Information */}
        <div className="p-6 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="pb-3 border-b border-[#262932] flex items-center gap-2">
            <Globe className="w-4 h-4 text-[#D6A84F]" />
            <h3 className="text-sm font-bold text-white">General Information & Support</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-[#A6A8B0] font-medium">Platform Brand Name</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A6A8B0] font-medium">Default Commercial Currency</label>
              <input
                type="text"
                disabled
                value={defaultCurrency}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-[#70737C] font-mono cursor-not-allowed"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A6A8B0] font-medium">Support Contact Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A6A8B0] font-medium">Support Helpline Number</label>
              <input
                type="text"
                value={supportPhone}
                onChange={(e) => setSupportPhone(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]/50 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Content & Pricing Defaults */}
        <div className="p-6 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="pb-3 border-b border-[#262932] flex items-center gap-2">
            <Coins className="w-4 h-4 text-[#B11226]" />
            <h3 className="text-sm font-bold text-white">Content Baselines & Entitlements</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-[#A6A8B0] font-medium">Default Stream Price (TZS)</label>
              <input
                type="number"
                value={streamPrice}
                onChange={(e) => setStreamPrice(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A6A8B0] font-medium">Default Download Price (TZS)</label>
              <input
                type="number"
                value={downloadPrice}
                onChange={(e) => setDownloadPrice(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none font-mono"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[#A6A8B0] font-medium">PPV Access Duration (Hours)</label>
              <input
                type="number"
                value={accessDuration}
                onChange={(e) => setAccessDuration(parseInt(e.target.value, 10))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none font-mono"
              />
            </div>
          </div>
        </div>

        {/* Device & Publishing Policies */}
        <div className="p-6 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="pb-3 border-b border-[#262932] flex items-center gap-2">
            <Shield className="w-4 h-4 text-[#10B981]" />
            <h3 className="text-sm font-bold text-white">Operational & Security Policies</h3>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-[#181A21] border border-[#262932]">
              <div>
                <p className="font-bold text-white">Maximum Registered Devices Per Customer</p>
                <p className="text-[#A6A8B0] mt-0.5">
                  Limit active concurrent login sessions to avoid account sharing across households.
                </p>
              </div>
              <div className="w-32">
                <select
                  value={maxDevices}
                  onChange={(e) => setMaxDevices(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none font-mono"
                >
                  <option value={1}>1 Device</option>
                  <option value={2}>2 Devices</option>
                  <option value={3}>3 Devices (Standard)</option>
                  <option value={5}>5 Devices</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[#181A21] border border-[#262932]">
              <div>
                <p className="font-bold text-white">Require Admin Approval for Catalog Releases</p>
                <p className="text-[#A6A8B0] mt-0.5">
                  When enabled, content uploaded and checked by Media Team remains pending until approved by Admin.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishingRequiresApproval}
                  onChange={(e) => setPublishingRequiresApproval(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#262932] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#B11226]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-[#181A21] border border-[#262932]">
              <div>
                <p className="font-bold text-white">Allow Protected Offline Downloads</p>
                <p className="text-[#A6A8B0] mt-0.5">
                  Permits mobile customer apps to save encrypted local copies of purchased content.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowOfflineDownloads}
                  onChange={(e) => setAllowOfflineDownloads(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-[#262932] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#10B981]"></div>
              </label>
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="p-6 rounded-2xl bg-[#111318] border border-[#262932] space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
                <span>Scheduled Maintenance Mode</span>
              </h3>
              <p className="text-[#A6A8B0]">
                Temporarily pause customer streaming and purchase flows while maintaining Admin workspace access.
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={maintenanceMode}
                onChange={(e) => setMaintenanceMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-[#262932] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#DC2626]"></div>
            </label>
          </div>

          {maintenanceMode && (
            <div className="pt-3 border-t border-[#262932] space-y-1.5 animate-in fade-in">
              <label className="text-[#A6A8B0] font-medium">Public Maintenance Notice Message</label>
              <textarea
                rows={2}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none resize-none"
              />
            </div>
          )}
        </div>

        {/* Save Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#B11226] text-white font-bold text-xs hover:bg-[#B11226]/90 transition-colors shadow-md shadow-[#B11226]/20"
          >
            {isSaving ? "Saving Settings..." : "Save Platform Settings"}
          </button>
        </div>
      </form>
    </div>
  );
}
