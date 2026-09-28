'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  FolderKanban,
  UploadCloud,
  Search,
  Filter,
  Film,
  FileVideo,
  Download,
  Image as ImageIcon,
  Play,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Trash2,
} from 'lucide-react';
import { mediaTeamRepository } from '@/lib/repositories/mediaTeamRepository';
import { MediaAssetItem, MediaAssetKind } from '@/types/mediaTeam';
import { MediaUploadModal } from '@/components/media-team/MediaUploadModal';

export default function MediaTeamAssetsPage() {
  const [assets, setAssets] = useState<MediaAssetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadAssets = async () => {
    try {
      const data = await mediaTeamRepository.getMediaAssets();
      setAssets(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset => {
      const matchesSearch =
        searchQuery.trim() === '' ||
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.fileName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.associatedTitle.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesKind = kindFilter === 'all' || asset.assetKind === kindFilter;

      return matchesSearch && matchesKind;
    });
  }, [assets, searchQuery, kindFilter]);

  const getKindIcon = (kind: MediaAssetKind) => {
    switch (kind) {
      case 'STREAMING_VIDEO':
        return <FileVideo className="w-4 h-4 text-blue-400" />;
      case 'DOWNLOAD_FILE':
        return <Download className="w-4 h-4 text-emerald-400" />;
      case 'POSTER':
        return <ImageIcon className="w-4 h-4 text-[#D6A84F]" />;
      case 'BACKDROP':
        return <ImageIcon className="w-4 h-4 text-blue-400" />;
      case 'TRAILER':
        return <Play className="w-4 h-4 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-2 bg-[#181A21] border border-emerald-500/40 text-white px-4 py-3 rounded-xl shadow-2xl text-xs backdrop-blur-md animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-[#111318] via-[#181A21] to-[#111318] p-6 rounded-2xl border border-[#262932] relative overflow-hidden shadow-xl">
        <div>
          <div className="flex items-center gap-2.5 mb-2">
            <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-[#181A21] text-[#A6A8B0] border border-[#262932] uppercase">
              Digital Assets
            </span>
            <span className="text-xs text-[#70737C] font-mono flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              {assets.length} Assets in Storage
            </span>
          </div>
          <h1 className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            Media Asset Library
          </h1>
          <p className="text-[#A6A8B0] text-xs mt-1 max-w-2xl font-sans">
            Central repository for ingested video streams, downloadable packages, posters, backdrops, and trailer files.
          </p>
        </div>

        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold text-xs transition-all shadow-md shadow-[#B11226]/20 border border-[#B11226]/40 shrink-0 active:scale-98"
        >
          <UploadCloud className="w-4 h-4" />
          Upload New Asset
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-[#70737C] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search asset or title name..."
            className="w-full bg-[#181A21] border border-[#262932] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-[#70737C] focus:outline-none focus:border-white/30"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-1.5 bg-[#181A21] border border-[#262932] rounded-xl px-3 py-1.5 text-xs text-[#A6A8B0]">
            <Filter className="w-3.5 h-3.5" />
            <span className="font-mono">Type:</span>
            <select
              value={kindFilter}
              onChange={e => setKindFilter(e.target.value)}
              className="bg-transparent text-white focus:outline-none text-xs font-medium cursor-pointer"
            >
              <option value="all" className="bg-[#181A21]">All Kinds</option>
              <option value="STREAMING_VIDEO" className="bg-[#181A21]">Streaming Video</option>
              <option value="DOWNLOAD_FILE" className="bg-[#181A21]">Download Package</option>
              <option value="POSTER" className="bg-[#181A21]">Poster (2:3)</option>
              <option value="BACKDROP" className="bg-[#181A21]">Backdrop (16:9)</option>
              <option value="TRAILER" className="bg-[#181A21]">Trailer</option>
            </select>
          </div>

          <div className="text-xs font-mono text-[#70737C] ml-auto sm:ml-2">
            Showing: <strong className="text-white">{filteredAssets.length}</strong>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-[#111318] border border-[#262932] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-[#181A21] border-b border-[#262932] text-xs font-mono text-[#70737C] uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Asset Name / File</th>
                <th className="py-3.5 px-4">Kind</th>
                <th className="py-3.5 px-4">Associated Title</th>
                <th className="py-3.5 px-4">File Size</th>
                <th className="py-3.5 px-4">Readiness</th>
                <th className="py-3.5 px-4">Uploaded</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#262932]/60 font-sans">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#70737C] font-mono text-xs">
                    Loading asset records...
                  </td>
                </tr>
              ) : filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#70737C] font-mono text-xs">
                    No assets found matching the criteria.
                  </td>
                </tr>
              ) : (
                filteredAssets.map(asset => (
                  <tr key={asset.id} className="hover:bg-[#181A21]/40 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#181A21] border border-[#262932] flex items-center justify-center shrink-0">
                          {getKindIcon(asset.assetKind)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-white truncate max-w-xs">
                            {asset.title}
                          </p>
                          <p className="text-[10px] text-[#70737C] font-mono truncate max-w-xs">
                            {asset.fileName}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] text-[#A6A8B0]">
                      {asset.assetKind.replace(/_/g, ' ')}
                    </td>

                    <td className="py-4 px-4 text-xs text-white font-medium truncate max-w-[180px]">
                      {asset.associatedTitle}
                    </td>

                    <td className="py-4 px-4 font-mono text-xs text-[#A6A8B0]">
                      {asset.fileSizeMb > 1024
                        ? `${(asset.fileSizeMb / 1024).toFixed(2)} GB`
                        : `${asset.fileSizeMb} MB`}
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded border ${
                          asset.status === 'ready'
                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                            : asset.status === 'processing'
                            ? 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                        }`}
                      >
                        {asset.status === 'ready' && <CheckCircle2 className="w-3 h-3" />}
                        {asset.status.toUpperCase()}
                      </span>
                    </td>

                    <td className="py-4 px-4 font-mono text-[11px] text-[#70737C]">
                      {asset.uploadedAt}
                    </td>

                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => showToast(`Asset ${asset.title} copied to clipboard.`)}
                        className="px-2.5 py-1 rounded-lg bg-[#181A21] hover:bg-[#262932] text-white text-[11px] font-medium border border-[#262932] transition-colors"
                      >
                        Copy URL
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Upload Modal */}
      <MediaUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(name, type) => {
          showToast(`Asset "${name}" uploaded successfully.`);
          loadAssets();
        }}
      />
    </div>
  );
}
