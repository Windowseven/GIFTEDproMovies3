'use client';

import React, { useState, useEffect, useMemo } from "react";
import {
  Tags,
  Plus,
  Search,
  CheckCircle2,
  Edit2,
  Trash2,
  X,
  Check,
  AlertTriangle,
  Eye,
  EyeOff,
  SlidersHorizontal,
  ArrowUpDown,
  ShieldAlert,
} from "lucide-react";
import { adminRepository } from "@/lib/repositories/adminRepository";
import { AdminCategory } from "@/types/admin";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formOrder, setFormOrder] = useState(1);

  // Edit Modal State
  const [editingCategory, setEditingCategory] = useState<AdminCategory | null>(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editOrder, setEditOrder] = useState(1);

  // Smart Delete Safeguard State
  const [deletingCategory, setDeletingCategory] = useState<AdminCategory | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadCategories = async () => {
    const data = await adminRepository.getCategories();
    setCategories(data);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const filteredCategories = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return categories;
    return categories.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.slug.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q)
    );
  }, [categories, searchQuery]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;

    await adminRepository.addCategory({
      name: formName.trim(),
      slug: formName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: formDesc.trim(),
      displayOrder: formOrder,
      contentCount: 0,
      isActive: true,
    });

    setIsAddModalOpen(false);
    setFormName("");
    setFormDesc("");
    showToast(`Category "${formName}" added successfully.`);
    loadCategories();
  };

  const handleOpenEdit = (cat: AdminCategory) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditSlug(cat.slug);
    setEditDesc(cat.description);
    setEditOrder(cat.displayOrder);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory || !editName.trim()) return;

    await adminRepository.updateCategory(editingCategory.id, {
      name: editName.trim(),
      slug: editSlug.trim() || editName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      description: editDesc.trim(),
      displayOrder: editOrder,
    });

    setEditingCategory(null);
    showToast(`Category "${editName}" updated.`);
    loadCategories();
  };

  const handleToggleStatus = async (cat: AdminCategory) => {
    await adminRepository.toggleCategoryStatus(cat.id);
    const nextState = !cat.isActive ? "ACTIVE" : "INACTIVE";
    showToast(`"${cat.name}" is now ${nextState}.`);
    loadCategories();
  };

  const handleInitiateDelete = (cat: AdminCategory) => {
    if (cat.contentCount === 0) {
      if (confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
        confirmDelete(cat.id, cat.name);
      }
    } else {
      // Content linked — open smart safeguard modal
      setDeletingCategory(cat);
    }
  };

  const confirmDelete = async (id: string, name: string) => {
    await adminRepository.deleteCategory(id);
    setDeletingCategory(null);
    showToast(`Category "${name}" deleted from platform.`);
    loadCategories();
  };

  const handleDeactivateInstead = async (cat: AdminCategory) => {
    if (cat.isActive) {
      await adminRepository.toggleCategoryStatus(cat.id);
    }
    setDeletingCategory(null);
    showToast(`Category "${cat.name}" deactivated (hidden from discovery while preserving catalog links).`);
    loadCategories();
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
            <Tags className="w-4 h-4 text-[#B11226]" />
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Category & Genre Taxonomies
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-[#181A21] text-[#A6A8B0] border border-[#262932]">
              {categories.length} Categories
            </span>
          </div>
          <p className="text-xs text-[#A6A8B0]">
            Govern catalog genres, discovery navigation tabs, display priority, and content linking.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setFormOrder(categories.length + 1);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-[#B11226] text-white font-semibold text-xs hover:bg-[#8F0D1E] transition-all flex items-center justify-center gap-2 shadow-md shadow-[#B11226]/20 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Category</span>
        </button>
      </div>

      {/* Search & Statistics Filter Bar */}
      <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#70737C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search categories by name, slug, or keywords..."
            className="w-full pl-10 pr-4 py-2 rounded-xl bg-[#181A21] border border-[#262932] text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-[#D6A84F]/50"
          />
        </div>

        <div className="flex items-center gap-2 text-xs font-mono text-[#A6A8B0]">
          <span>Active: <strong className="text-emerald-400 font-bold">{categories.filter(c => c.isActive).length}</strong></span>
          <span>•</span>
          <span>Inactive: <strong className="text-[#70737C] font-bold">{categories.filter(c => !c.isActive).length}</strong></span>
        </div>
      </div>

      {/* Categories Table */}
      <div className="p-5 rounded-2xl bg-[#111318] border border-[#262932] overflow-x-auto">
        <table className="w-full text-left text-xs min-w-[700px]">
          <thead>
            <tr className="border-b border-[#262932] text-[#70737C] font-mono text-[10px] uppercase">
              <th className="pb-3 font-semibold w-16">Order</th>
              <th className="pb-3 font-semibold">Name</th>
              <th className="pb-3 font-semibold">Slug URL</th>
              <th className="pb-3 font-semibold">Description</th>
              <th className="pb-3 font-semibold">Titles Assigned</th>
              <th className="pb-3 font-semibold text-center">Status</th>
              <th className="pb-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#262932]">
            {filteredCategories.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-[#70737C]">
                  No categories match your search criteria.
                </td>
              </tr>
            ) : (
              filteredCategories.map((cat) => (
                <tr key={cat.id} className="hover:bg-[#181A21]/50 transition-colors group">
                  {/* Priority Order */}
                  <td className="py-3.5 font-mono text-[#A6A8B0]">
                    <span className="w-6 h-6 rounded bg-[#181A21] border border-[#262932] flex items-center justify-center text-[11px] font-bold">
                      #{cat.displayOrder}
                    </span>
                  </td>

                  {/* Category Name */}
                  <td className="py-3.5 font-bold text-white text-xs">
                    {cat.name}
                  </td>

                  {/* Slug */}
                  <td className="py-3.5 font-mono text-[11px] text-[#70737C]">
                    /{cat.slug}
                  </td>

                  {/* Description */}
                  <td className="py-3.5 text-[#A6A8B0] max-w-xs truncate text-[11px]">
                    {cat.description || "—"}
                  </td>

                  {/* Content Count */}
                  <td className="py-3.5 font-mono font-bold text-white text-xs">
                    {cat.contentCount.toLocaleString()} titles
                  </td>

                  {/* Status Toggle Button */}
                  <td className="py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => handleToggleStatus(cat)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold border transition-all ${
                        cat.isActive
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
                          : "bg-zinc-500/15 text-zinc-400 border-zinc-500/30 hover:bg-zinc-500/25"
                      }`}
                      title="Click to toggle visibility in discovery filters"
                    >
                      {cat.isActive ? "ACTIVE" : "INACTIVE"}
                    </button>
                  </td>

                  {/* Action Buttons: Edit & Delete */}
                  <td className="py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(cat)}
                        className="p-1.5 rounded-lg text-[#70737C] hover:text-white hover:bg-[#181A21] border border-transparent hover:border-[#262932] transition-colors"
                        title="Edit Category Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => handleInitiateDelete(cat)}
                        className="p-1.5 rounded-lg text-[#70737C] hover:text-[#DC2626] hover:bg-[#DC2626]/10 border border-transparent hover:border-[#DC2626]/20 transition-colors"
                        title="Delete Category"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Category */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsAddModalOpen(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <div className="flex items-center gap-2">
                <Tags className="w-4 h-4 text-[#B11226]" />
                <h3 className="text-sm font-bold text-white">Add New Category</h3>
              </div>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Category Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Martial Arts"
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#B11226]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Description</label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Short description for SEO and category headers..."
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#B11226] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Display Priority Order</label>
                <input
                  type="number"
                  min="1"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none font-mono"
                />
                <span className="text-[10px] text-[#70737C] font-mono">Lower numbers appear first in the customer navigation bar.</span>
              </div>

              <div className="pt-3 border-t border-[#262932] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold transition-all shadow-md shadow-[#B11226]/20"
                >
                  Create Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Category */}
      {editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setEditingCategory(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#181A21] border border-[#262932] p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#262932]">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-[#D6A84F]" />
                <h3 className="text-sm font-bold text-white">Edit Category</h3>
              </div>
              <button type="button" onClick={() => setEditingCategory(null)} className="text-[#70737C] hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Category Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => {
                    setEditName(e.target.value);
                    setEditSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"));
                  }}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">URL Slug</label>
                <input
                  type="text"
                  required
                  value={editSlug}
                  onChange={(e) => setEditSlug(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white font-mono focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none focus:border-[#D6A84F] resize-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[#A6A8B0] font-medium">Display Priority Order</label>
                <input
                  type="number"
                  min="1"
                  value={editOrder}
                  onChange={(e) => setEditOrder(parseInt(e.target.value, 10) || 1)}
                  className="w-full px-3 py-2 rounded-xl bg-[#111318] border border-[#262932] text-white focus:outline-none font-mono"
                />
              </div>

              <div className="pt-3 border-t border-[#262932] flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingCategory(null)}
                  className="px-4 py-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors shadow-md shadow-emerald-600/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Smart Delete Safeguard Modal */}
      {deletingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setDeletingCategory(null)} />
          <div className="relative w-full max-w-md rounded-2xl bg-[#181A21] border border-amber-500/40 p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h3 className="text-sm font-bold text-white">
                  Delete "{deletingCategory.name}"?
                </h3>
                <p className="text-xs text-amber-400 font-mono mt-0.5">
                  {deletingCategory.contentCount} titles currently assigned
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-[#111318] border border-[#262932] text-xs text-[#A6A8B0] space-y-2">
              <p>
                Deleting this category permanently will remove the genre tag from all <strong>{deletingCategory.contentCount} titles</strong> in the streaming catalog.
              </p>
              <p className="text-[#70737C]">
                <strong>Recommendation:</strong> Deactivate the category instead. It will be hidden from new intake and viewer navigation menus without modifying existing movie and series tags.
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => handleDeactivateInstead(deletingCategory)}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs transition-colors shadow-md shadow-blue-600/20"
              >
                Deactivate Instead (Recommended)
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDeletingCategory(null)}
                  className="flex-1 py-2 rounded-xl bg-[#111318] border border-[#262932] text-[#A6A8B0] hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => confirmDelete(deletingCategory.id, deletingCategory.name)}
                  className="flex-1 py-2 rounded-xl bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-xs transition-colors shadow-md shadow-red-600/20"
                >
                  Force Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
