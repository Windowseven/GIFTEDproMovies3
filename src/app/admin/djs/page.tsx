'use client';

import React, { useState, useEffect } from "react";
import {
  Mic2,
  Plus,
  Search,
  CheckCircle2,
  Sparkles,
  Edit2,
  Trash2,
  X,
  Check,
  Film,
  TrendingUp,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminDJ } from "@/types/admin";

export default function AdminDJsPage() {
  const [djs, setDjs] = useState<AdminDJ[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDj, setSelectedDj] = useState<AdminDJ | null>(null);

  // Simplified Form States
  const [formStageName, setFormStageName] = useState("");
  const [formBio, setFormBio] = useState("");
  const [formAvatar, setFormAvatar] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const loadDjs = async () => {
    const data = await adminRepository.getDJs();
    setDjs(data);
  };

  useEffect(() => {
    loadDjs();
  }, []);

  const filteredDjs = djs.filter(
    (d) =>
      d.stageName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.bio.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenAdd = () => {
    setSelectedDj(null);
    setFormStageName("");
    setFormBio("");
    setFormAvatar("");
    setIsModalOpen(true);
  };

  const handleOpenEdit = (dj: AdminDJ) => {
    setSelectedDj(dj);
    setFormStageName(dj.stageName);
    setFormBio(dj.bio);
    setFormAvatar(dj.avatarUrl);
    setIsModalOpen(true);
  };

  const handleSaveDj = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formStageName.trim()) return;

    const defaultAvatar = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";

    if (selectedDj) {
      await adminRepository.updateDJ(selectedDj.id, {
        name: formStageName.trim(),
        stageName: formStageName.trim(),
        slug: formStageName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        bio: formBio.trim(),
        avatarUrl: formAvatar.trim() || selectedDj.avatarUrl || defaultAvatar,
      });
      setToastMessage(`DJ "${formStageName}" updated.`);
    } else {
      await adminRepository.addDJ({
        name: formStageName.trim(),
        stageName: formStageName.trim(),
        slug: formStageName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        avatarUrl: formAvatar.trim() || defaultAvatar,
        bio: formBio.trim() || "Swahili voice translator specializing in contemporary and classic cinema.",
        tier: "Master Voice Roster",
        contractType: "Content Acquisition",
        colorHex: "#B11226",
        status: "active",
      });
      setToastMessage(`DJ "${formStageName}" added to platform.`);
    }

    setIsModalOpen(false);
    setSelectedDj(null);
    setTimeout(() => setToastMessage(null), 3000);
    loadDjs();
  };

  const handleDeleteDj = async (id: string, stageName: string) => {
    if (confirm(`Are you sure you want to remove "${stageName}" from available translators?`)) {
      await adminRepository.deleteDJ(id);
      setToastMessage(`DJ "${stageName}" removed.`);
      setTimeout(() => setToastMessage(null), 3000);
      loadDjs();
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
          <div className="flex items-center gap-2">
            <Mic2 className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              DJs & Voice Translators
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              {djs.length} Translators Active
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Manage translated voice brands, signature commentary styles, and catalog attribution for acquired titles.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="px-4 py-2.5 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-md shadow-[#B11226]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add DJ / Translator</span>
        </button>
      </div>

      {/* Toolbar / Search */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search DJ or translator by name or style..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>

        <div className="text-xs font-mono text-[#A6A8B0]">
          Total Titles Sourced: <strong className="text-white font-bold">{djs.reduce((acc, d) => acc + d.activeTitlesCount, 0)}</strong>
        </div>
      </div>

      {/* DJs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredDjs.length === 0 ? (
          <div className="col-span-full p-8 text-center bg-[#111318] border border-[#262932] rounded-2xl space-y-2">
            <Mic2 className="w-8 h-8 text-[#70737C] mx-auto" />
            <p className="text-sm font-semibold text-white">No translators match your search</p>
            <p className="text-xs text-[#70737C]">Click "Add DJ / Translator" above to register a new voice tag.</p>
          </div>
        ) : (
          filteredDjs.map((dj) => (
            <div
              key={dj.id}
              className="p-5 rounded-2xl bg-[#111318] border border-[#262932] hover:border-[#70737C]/40 transition-colors flex gap-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#181A21] overflow-hidden shrink-0 border border-[#262932]">
                <img
                  src={dj.avatarUrl}
                  alt={dj.stageName}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback avatar
                    (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80";
                  }}
                />
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                      <span>{dj.stageName}</span>
                      <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30">
                        Swahili Dubs
                      </span>
                    </h3>
                    <p className="text-[11px] text-[#70737C] font-mono">Catalog Tag: /{dj.slug}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(dj)}
                      className="p-1.5 rounded-lg bg-[#181A21] border border-[#262932] text-[#A6A8B0] hover:text-white transition-colors"
                      title="Edit DJ Info"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteDj(dj.id, dj.stageName)}
                      className="p-1.5 rounded-lg text-[#70737C] hover:text-[#DC2626] hover:bg-[#DC2626]/10 border border-transparent hover:border-[#DC2626]/20 transition-colors"
                      title="Remove DJ"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-[#A6A8B0] line-clamp-2 leading-relaxed">
                  {dj.bio || "Acquired Swahili voiceover titles in the platform catalog."}
                </p>

                <div className="pt-2 border-t border-[#262932] flex items-center justify-between text-[11px]">
                  <span className="text-[#70737C] font-mono">{dj.activeTitlesCount} Acquired Titles</span>
                  <span className="font-mono text-[#10B981] font-semibold">
                    {(dj.totalStreams / 1000000).toFixed(1)}M Total Streams
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Simplified Add / Edit DJ Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <div className="flex items-center gap-2">
                <Mic2 className="w-4 h-4 text-[#B11226]" />
                <h3 className="text-sm font-bold text-white">
                  {selectedDj ? "Edit DJ / Translator" : "Add DJ / Translator"}
                </h3>
              </div>
              <button type="button" onClick={() => setIsModalOpen(false)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-[#A6A8B0]">
              Register the voice translator name to tag acquired movies and series for viewer discovery.
            </p>

            <form onSubmit={handleSaveDj} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">DJ / Translator Name *</label>
                <input
                  type="text"
                  required
                  autoFocus
                  value={formStageName}
                  onChange={(e) => setFormStageName(e.target.value)}
                  placeholder="e.g. DJ Afro, DJ Murphy, DJ Ally"
                  className="w-full px-3 py-2.5 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#B11226]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Signature Style & Bio (Optional)</label>
                <textarea
                  rows={3}
                  value={formBio}
                  onChange={(e) => setFormBio(e.target.value)}
                  placeholder="e.g. Specializes in Action, Kung-Fu & Comedy with high-energy commentary..."
                  className="w-full px-3 py-2.5 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#B11226] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Avatar Image URL (Optional)</label>
                <input
                  type="url"
                  value={formAvatar}
                  onChange={(e) => setFormAvatar(e.target.value)}
                  placeholder="https://images.unsplash.com/... (or leave blank for default)"
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none font-mono text-[11px]"
                />
              </div>

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
                  className="px-4 py-2 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold transition-all shadow-md shadow-[#B11226]/20"
                >
                  {selectedDj ? "Save Changes" : "Save DJ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
