'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldCheck,
  Plus,
  Search,
  CheckCircle2,
  Lock,
  UserCheck,
  Edit2,
  X,
  Check,
  History,
  Users,
  Film,
  Tv,
  Clock,
  Sparkles,
  FileVideo,
  DollarSign,
  AlertCircle,
  Tag,
  CheckSquare,
  KeyRound,
  Trash2,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { MediaTeamStaff, MediaAuditLog, MediaAuditAction } from "@/types/admin";

export default function AdminMediaTeamPage() {
  const [activeTab, setActiveTab] = useState<"staff" | "audit">("staff");
  const [staffList, setStaffList] = useState<MediaTeamStaff[]>([]);
  const [auditLogs, setAuditLogs] = useState<MediaAuditLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState<MediaTeamStaff | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formIsFullAccess, setFormIsFullAccess] = useState(true);
  const [formCanUpload, setFormCanUpload] = useState(true);
  const [formCanEditMeta, setFormCanEditMeta] = useState(true);
  const [formCanManagePricing, setFormCanManagePricing] = useState(true);
  const [formCanPublish, setFormCanPublish] = useState(false);
  const [formRole, setFormRole] = useState("Full Studio Operator");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Audit Filter states
  const [auditSearchQuery, setAuditSearchQuery] = useState("");
  const [selectedOperatorFilter, setSelectedOperatorFilter] = useState<string>("all");
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>("all");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    const [staff, logs] = await Promise.all([
      adminRepository.getMediaTeamStaff(),
      adminRepository.getMediaAuditLogs(),
    ]);
    setStaffList(staff);
    setAuditLogs(logs);
  };

  useEffect(() => {
    loadData();
  }, []);

  // When Full Access is toggled, sync permissions
  const handleToggleFullAccess = (checked: boolean) => {
    setFormIsFullAccess(checked);
    if (checked) {
      setFormCanUpload(true);
      setFormCanEditMeta(true);
      setFormCanManagePricing(true);
      setFormCanPublish(true);
      setFormRole("Full Studio Operator");
    } else {
      setFormRole("Custom Access Operator");
    }
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formEmail.trim()) return;

    if (selectedStaff) {
      await adminRepository.updateStaffMember(selectedStaff.id, {
        name: formName,
        email: formEmail,
        role: formRole,
        isFullAccess: formIsFullAccess,
        canUpload: formCanUpload,
        canEditMetadata: formCanEditMeta,
        canManagePricing: formCanManagePricing,
        canPublish: formCanPublish,
      });
      showToast(`Updated ${formName} permissions.`);
    } else {
      await adminRepository.addStaffMember({
        name: formName,
        email: formEmail,
        role: formRole,
        avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + staffList.length}?w=200&auto=format&fit=crop&q=80`,
        status: "active",
        assignedContentCount: 0,
        isFullAccess: formIsFullAccess,
        canUpload: formCanUpload,
        canEditMetadata: formCanEditMeta,
        canManagePricing: formCanManagePricing,
        canPublish: formCanPublish,
        lastActive: "Just added",
      });
      showToast(`Added ${formName} to Media Team.`);
    }

    setIsModalOpen(false);
    setSelectedStaff(null);
    loadData();
  };

  const handleToggleStatus = async (id: string) => {
    await adminRepository.toggleStaffStatus(id);
    showToast("Operator status updated.");
    loadData();
  };

  const handleDeleteStaff = async (id: string, name: string) => {
    if (confirm(`Remove operator "${name}" from Media Team?`)) {
      await adminRepository.deleteStaffMember(id);
      showToast(`Removed "${name}".`);
      loadData();
    }
  };

  // Filtered Audit Logs
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const q = auditSearchQuery.toLowerCase().trim();
      const matchesSearch =
        q === "" ||
        log.contentTitle.toLowerCase().includes(q) ||
        log.operatorName.toLowerCase().includes(q) ||
        log.actionLabel.toLowerCase().includes(q) ||
        log.details.toLowerCase().includes(q);

      const matchesOperator =
        selectedOperatorFilter === "all" || log.operatorId === selectedOperatorFilter;

      const matchesAction =
        selectedActionFilter === "all" || log.action === selectedActionFilter;

      return matchesSearch && matchesOperator && matchesAction;
    });
  }, [auditLogs, auditSearchQuery, selectedOperatorFilter, selectedActionFilter]);

  // Derived metrics
  const activeStaffCount = useMemo(() => staffList.filter((s) => s.status === "active").length, [staffList]);
  const fullAccessCount = useMemo(() => staffList.filter((s) => s.isFullAccess || (s.canUpload && s.canEditMetadata && s.canPublish)).length, [staffList]);
  const totalAssignedTitles = useMemo(() => staffList.reduce((acc, s) => acc + (s.assignedContentCount || 0), 0), [staffList]);

  const getActionBadgeColor = (action: MediaAuditAction) => {
    switch (action) {
      case "UPLOAD_MASTER":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "UPDATE_METADATA":
        return "bg-purple-500/15 text-purple-400 border-purple-500/30";
      case "UPDATE_PRICING":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "PUBLISH_LIVE":
        return "bg-[#10B981]/15 text-[#10B981] border-[#10B981]/30";
      case "SUBMIT_REVIEW":
        return "bg-[#D6A84F]/15 text-[#D6A84F] border-[#D6A84F]/30";
      case "STATUS_CHANGE":
        return "bg-[#70737C]/15 text-[#A6A8B0] border-[#262932]";
      default:
        return "bg-[#181A21] text-white border-[#262932]";
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#181A21] border border-[#10B981]/40 text-white text-xs px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-[#10B981]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] border border-[#262932] p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Media Team Operations &amp; Audit Trail
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#D6A84F] border border-[#D6A84F]/30 font-bold">
              {activeStaffCount} Active Operators
            </span>

            {/* Subtle Tooltip Badge */}
            <div className="relative group">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932] flex items-center gap-1 cursor-help hover:text-white hover:border-[#D6A84F]/40 transition-colors">
                <Lock className="w-3 h-3 text-[#D6A84F]" />
                Isolated Access Policy
              </span>
              <div className="absolute left-0 top-full mt-2 w-80 p-3 rounded-xl bg-[#181A21] border border-[#262932] shadow-2xl text-[11px] text-[#A6A8B0] z-50 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all pointer-events-none leading-relaxed">
                <p className="font-semibold text-white mb-1 flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5 text-[#D6A84F]" /> Financial &amp; Customer Data Isolation
                </p>
                Media Team accounts are restricted to content intake workflows (<code className="text-[#D6A84F]">/media-team/*</code>). Platform gross revenues, M-Pesa / Airtel Money transaction feeds, customer phone numbers, and DJ royalty percentages are completely hidden.
              </div>
            </div>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Manage operator permissions and track all content uploads and updates in real time.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setSelectedStaff(null);
            setFormName("");
            setFormEmail("");
            setFormRole("Full Studio Operator");
            setFormIsFullAccess(true);
            setFormCanUpload(true);
            setFormCanEditMeta(true);
            setFormCanManagePricing(true);
            setFormCanPublish(true);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-[#B11226]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Media Operator</span>
        </button>
      </div>

      {/* 4 Summary Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-1">
          <div className="flex items-center justify-between text-[#70737C]">
            <span className="text-[11px] font-mono uppercase">Active Operators</span>
            <Users className="w-4 h-4 text-white" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{activeStaffCount} <span className="text-xs font-mono text-[#70737C]">/ {staffList.length}</span></p>
          <p className="text-[11px] text-[#A6A8B0]">Content intake team members</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-1">
          <div className="flex items-center justify-between text-[#70737C]">
            <span className="text-[11px] font-mono uppercase">Full Studio Access</span>
            <KeyRound className="w-4 h-4 text-[#D6A84F]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#D6A84F]">{fullAccessCount} <span className="text-xs font-mono text-[#70737C]">Operators</span></p>
          <p className="text-[11px] text-[#A6A8B0]">Unrestricted studio permissions</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-1">
          <div className="flex items-center justify-between text-[#70737C]">
            <span className="text-[11px] font-mono uppercase">Total Ingested Titles</span>
            <Film className="w-4 h-4 text-[#10B981]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-white">{totalAssignedTitles}</p>
          <p className="text-[11px] text-[#A6A8B0]">Delivered by DJ partners</p>
        </div>

        <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-1">
          <div className="flex items-center justify-between text-[#70737C]">
            <span className="text-[11px] font-mono uppercase">Audit Log Events</span>
            <History className="w-4 h-4 text-[#3B82F6]" />
          </div>
          <p className="text-xl sm:text-2xl font-black text-[#3B82F6]">{auditLogs.length} <span className="text-xs font-mono text-[#70737C]">Logged</span></p>
          <p className="text-[11px] text-[#A6A8B0]">Actions tracked in chain of custody</p>
        </div>
      </div>

      {/* Navigation Tab Bar: Staff vs Audit Trail */}
      <div className="flex items-center gap-2 border-b border-[#262932] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("staff")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === "staff"
              ? "bg-[#181A21] text-white border border-[#262932] shadow-sm"
              : "text-[#70737C] hover:text-white"
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Staff &amp; Permissions ({staffList.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition-all ${
            activeTab === "audit"
              ? "bg-[#181A21] text-white border border-[#262932] shadow-sm"
              : "text-[#70737C] hover:text-white"
          }`}
        >
          <History className="w-4 h-4 text-[#3B82F6]" />
          <span>Activity Trail &amp; Audit Log (&quot;Who Did What?&quot;)</span>
          <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-[#3B82F6]/20 text-[#3B82F6]">
            {auditLogs.length}
          </span>
        </button>
      </div>

      {/* Tab 1: Staff & Permissions */}
      {activeTab === "staff" && (
        <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] overflow-hidden space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white">Media Team Operators Roster</h2>
            <p className="text-xs text-[#70737C]">Toggle between Full Studio Access and custom permissions per operator.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                  <th className="pb-3 font-semibold">Operator</th>
                  <th className="pb-3 font-semibold">Access Profile</th>
                  <th className="pb-3 font-semibold">Assigned Intake</th>
                  <th className="pb-3 font-semibold">Granted Permissions</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262932]">
                {staffList.map((staff) => (
                  <tr key={staff.id} className="hover:bg-[#181A21]/50 transition-colors">
                    <td className="py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-[#181A21] border border-[#262932] overflow-hidden shrink-0">
                          <img src={staff.avatarUrl} alt={staff.name} className="w-full h-full object-cover" />
                        </div>
                        <div>
                          <p className="font-bold text-white">{staff.name}</p>
                          <p className="text-[11px] text-[#70737C] font-mono">{staff.email}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5">
                      {staff.isFullAccess || (staff.canUpload && staff.canEditMetadata && staff.canPublish) ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#D6A84F]/15 text-[#D6A84F] border border-[#D6A84F]/30 flex items-center gap-1 w-fit">
                          <Sparkles className="w-3 h-3" /> Full Studio Access
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono text-[#A6A8B0] bg-[#181A21] border border-[#262932] w-fit">
                          Custom Permissions
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 font-mono text-white">
                      {staff.assignedContentCount} titles
                    </td>

                    <td className="py-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {staff.canUpload && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#181A21] text-white border border-[#262932]" title="Can upload video masters">
                            Upload Video
                          </span>
                        )}
                        {staff.canEditMetadata && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#181A21] text-white border border-[#262932]" title="Can edit artwork & synopses">
                            Artwork &amp; Meta
                          </span>
                        )}
                        {staff.canManagePricing && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#181A21] text-white border border-[#262932]" title="Can set PPV prices and DJ tags">
                            Pricing &amp; DJ
                          </span>
                        )}
                        {staff.canPublish ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30">
                            Direct Publish
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/30">
                            Approval Gate
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5">
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(staff.id)}
                        className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold capitalize transition-all ${
                          staff.status === "active"
                            ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/30 hover:bg-[#10B981]/25"
                            : "bg-[#70737C]/15 text-[#70737C] border border-[#70737C]/30 hover:text-white"
                        }`}
                        title="Click to toggle active / suspended"
                      >
                        ● {staff.status}
                      </button>
                    </td>

                    <td className="py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStaff(staff);
                            setFormName(staff.name);
                            setFormEmail(staff.email);
                            setFormRole(staff.role);
                            setFormIsFullAccess(staff.isFullAccess ?? false);
                            setFormCanUpload(staff.canUpload);
                            setFormCanEditMeta(staff.canEditMetadata);
                            setFormCanManagePricing(staff.canManagePricing ?? true);
                            setFormCanPublish(staff.canPublish);
                            setIsModalOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white hover:border-[#D6A84F]/40 transition-colors"
                          title="Edit operator permissions"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteStaff(staff.id, staff.name)}
                          className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-[#70737C] hover:text-rose-400 hover:border-rose-500/30 transition-colors"
                          title="Remove operator"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Activity Trail & Audit Log */}
      {activeTab === "audit" && (
        <div className="space-y-4">
          {/* Search & Filter Toolbar */}
          <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
              <input
                type="text"
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                placeholder="Search audit trail by title, operator, or details..."
                className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#3B82F6]/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Operator Filter */}
              <select
                value={selectedOperatorFilter}
                onChange={(e) => setSelectedOperatorFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="all">All Operators</option>
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>

              {/* Action Filter */}
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="px-3 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white focus:outline-none focus:border-[#3B82F6]"
              >
                <option value="all">All Actions</option>
                <option value="UPLOAD_MASTER">Master Video Uploads</option>
                <option value="UPDATE_METADATA">Artwork &amp; Metadata</option>
                <option value="UPDATE_PRICING">Pricing &amp; Rates</option>
                <option value="SUBMIT_REVIEW">Submitted for Review</option>
                <option value="PUBLISH_LIVE">Published Live</option>
                <option value="STATUS_CHANGE">Staff Status Changes</option>
              </select>
            </div>
          </div>

          {/* Audit Log Table */}
          <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] overflow-hidden">
            {filteredAuditLogs.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <History className="w-8 h-8 text-[#70737C] mx-auto" />
                <p className="text-sm font-semibold text-white">No audit records found</p>
                <p className="text-xs text-[#70737C]">Try clearing search or changing filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
                      <th className="pb-3 font-semibold">Timestamp</th>
                      <th className="pb-3 font-semibold">Operator</th>
                      <th className="pb-3 font-semibold">Action Performed</th>
                      <th className="pb-3 font-semibold">Target Title</th>
                      <th className="pb-3 font-semibold">Context &amp; Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#262932]">
                    {filteredAuditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#181A21]/50 transition-colors">
                        <td className="py-3.5 font-mono text-[#A6A8B0] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-[#70737C]" />
                            <span>{log.timestamp}</span>
                          </div>
                        </td>

                        <td className="py-3.5">
                          <div className="flex items-center gap-2">
                            {log.operatorAvatar && (
                              <div className="w-6 h-6 rounded-full bg-[#181A21] border border-[#262932] overflow-hidden shrink-0">
                                <img src={log.operatorAvatar} alt={log.operatorName} className="w-full h-full object-cover" />
                              </div>
                            )}
                            <span className="font-bold text-white whitespace-nowrap">{log.operatorName}</span>
                          </div>
                        </td>

                        <td className="py-3.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border inline-block ${getActionBadgeColor(
                              log.action
                            )}`}
                          >
                            {log.actionLabel}
                          </span>
                        </td>

                        <td className="py-3.5">
                          <div className="flex items-center gap-1.5">
                            {log.contentType === "movie" ? (
                              <Film className="w-3.5 h-3.5 text-[#70737C] shrink-0" />
                            ) : (
                              <Tv className="w-3.5 h-3.5 text-[#70737C] shrink-0" />
                            )}
                            <span className="font-semibold text-white truncate max-w-xs">{log.contentTitle}</span>
                          </div>
                        </td>

                        <td className="py-3.5 text-[#A6A8B0] max-w-md">
                          <p className="line-clamp-2">{log.details}</p>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add / Edit Operator Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#B11226]" />
                <h3 className="text-sm font-bold text-white">
                  {selectedStaff ? "Edit Operator & Permissions" : "Add Media Team Operator"}
                </h3>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              {/* Name & Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="e.g. Hassan SoundBoy"
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[#A6A8B0] font-medium">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    placeholder="e.g. hassan@giftedpromovies.com"
                    className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]"
                  />
                </div>
              </div>

              {/* Master Permission Preset: Full Studio Access Toggle */}
              <div className="p-3.5 rounded-xl bg-[#111318] border border-[#D6A84F]/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#D6A84F]" />
                    <span className="font-bold text-white">Full Media Studio Access</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formIsFullAccess}
                    onChange={(e) => handleToggleFullAccess(e.target.checked)}
                    className="w-4 h-4 rounded text-[#B11226] focus:ring-0 cursor-pointer"
                  />
                </div>
                <p className="text-[11px] text-[#A6A8B0]">
                  Enable this for solo operators or senior team members to automatically grant complete authority across intake, packaging, pricing, and publishing.
                </p>
              </div>

              {/* Granular Permission Checkboxes */}
              <div className="space-y-2 pt-1">
                <p className="text-[11px] font-mono uppercase text-[#70737C]">
                  {formIsFullAccess ? "Active Permissions (All Included)" : "Custom Granular Permissions"}
                </p>

                <div className="space-y-2">
                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#111318] border border-[#262932] cursor-pointer hover:border-[#70737C]/40">
                    <input
                      type="checkbox"
                      disabled={formIsFullAccess}
                      checked={formCanUpload}
                      onChange={(e) => setFormCanUpload(e.target.checked)}
                      className="w-4 h-4 rounded text-[#B11226] focus:ring-0 disabled:opacity-50"
                    />
                    <div>
                      <span className="font-semibold text-white block">1. Can Upload Video Masters</span>
                      <span className="text-[11px] text-[#70737C]">Ingest delivered MP4/MKV video files from DJ partners.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#111318] border border-[#262932] cursor-pointer hover:border-[#70737C]/40">
                    <input
                      type="checkbox"
                      disabled={formIsFullAccess}
                      checked={formCanEditMeta}
                      onChange={(e) => setFormCanEditMeta(e.target.checked)}
                      className="w-4 h-4 rounded text-[#B11226] focus:ring-0 disabled:opacity-50"
                    />
                    <div>
                      <span className="font-semibold text-white block">2. Can Edit Artwork &amp; Metadata</span>
                      <span className="text-[11px] text-[#70737C]">Upload 16:9 backdrops, 2:3 posters, and localized Swahili synopses.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#111318] border border-[#262932] cursor-pointer hover:border-[#70737C]/40">
                    <input
                      type="checkbox"
                      disabled={formIsFullAccess}
                      checked={formCanManagePricing}
                      onChange={(e) => setFormCanManagePricing(e.target.checked)}
                      className="w-4 h-4 rounded text-[#B11226] focus:ring-0 disabled:opacity-50"
                    />
                    <div>
                      <span className="font-semibold text-white block">3. Can Manage Pricing &amp; DJ Tags</span>
                      <span className="text-[11px] text-[#70737C]">Set PPV stream / download rates and link to translating DJs.</span>
                    </div>
                  </label>

                  <label className="flex items-center gap-2.5 p-2 rounded-xl bg-[#111318] border border-[#262932] cursor-pointer hover:border-[#70737C]/40">
                    <input
                      type="checkbox"
                      disabled={formIsFullAccess}
                      checked={formCanPublish}
                      onChange={(e) => setFormCanPublish(e.target.checked)}
                      className="w-4 h-4 rounded text-[#B11226] focus:ring-0 disabled:opacity-50"
                    />
                    <div>
                      <span className="font-semibold text-white block">4. Can Direct Publish Live</span>
                      <span className="text-[11px] text-[#70737C]">
                        {formCanPublish
                          ? "Authorized to push titles directly to the live customer catalog."
                          : "Titles submitted will be held in Review Queue for Admin sign-off."}
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-[#262932] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold shadow-md shadow-[#B11226]/20 transition-all"
                >
                  {selectedStaff ? "Save Permissions" : "Add Operator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
