'use client';

import React, { useState, useEffect } from 'react';
import {
  UploadCloud,
  X,
  FileVideo,
  FileAudio,
  CheckCircle2,
  AlertTriangle,
  Play,
  Image as ImageIcon,
  Check,
} from 'lucide-react';
import { UploadLifecycleState, MediaAssetKind } from '@/types/mediaTeam';
import { mockAvailableDjs } from '@/data/mock/mediaTeamData';
import { mediaTeamRepository } from '@/lib/repositories/mediaTeamRepository';

interface MediaUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess?: (fileName: string, assetKind: string) => void;
}

export const MediaUploadModal: React.FC<MediaUploadModalProps> = ({
  isOpen,
  onClose,
  onUploadSuccess,
}) => {
  const [uploadState, setUploadState] = useState<UploadLifecycleState>('IDLE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [assetKind, setAssetKind] = useState<MediaAssetKind>('STREAMING_VIDEO');
  const [associatedTitle, setAssociatedTitle] = useState('Godzilla x Kong: The New Empire');
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (uploadState === 'UPLOADING') {
      interval = setInterval(() => {
        setProgressPercent(prev => {
          if (prev >= 95) {
            clearInterval(interval);
            setUploadState('PROCESSING');
            return 98;
          }
          return prev + Math.floor(Math.random() * 15) + 8;
        });
      }, 350);
    } else if (uploadState === 'PROCESSING') {
      const timeout = setTimeout(async () => {
        setProgressPercent(100);
        setUploadState('COMPLETED');
        // Save asset to repository
        await mediaTeamRepository.createMediaAsset({
          title: `${associatedTitle} - ${assetKind.replace('_', ' ')}`,
          fileName: selectedFile?.name || 'media_asset_master.mp4',
          fileSizeMb: Math.round(selectedFile ? selectedFile.size / (1024 * 1024) : 1450),
          assetKind,
          associatedTitle,
          status: 'ready',
        });
      }, 1200);
      return () => clearTimeout(timeout);
    }
    return () => clearInterval(interval);
  }, [uploadState, associatedTitle, assetKind, selectedFile]);

  if (!isOpen) return null;

  const handleStartUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile && uploadState === 'IDLE') {
      const mockBlob = new File([''], 'master_streaming_video.mp4', { type: 'video/mp4' });
      setSelectedFile(mockBlob);
    }
    setUploadState('PREPARING');
    setTimeout(() => {
      setUploadState('UPLOADING');
      setProgressPercent(12);
    }, 400);
  };

  const handleReset = () => {
    setUploadState('IDLE');
    setProgressPercent(0);
    setSelectedFile(null);
  };

  const handleFinish = () => {
    if (onUploadSuccess && selectedFile) {
      onUploadSuccess(selectedFile.name, assetKind);
    }
    handleReset();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#111318] border border-[#262932] rounded-2xl w-full max-w-lg shadow-2xl p-6 relative overflow-hidden">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 mb-1">
          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#181A21] text-[#A6A8B0] border border-[#262932] uppercase">
            Asset Ingestion
          </span>
          <span className="text-[11px] font-mono text-gray-400">Media Library Intake</span>
        </div>
        <h2 className="text-xl font-black text-white tracking-tight">
          Ingest Content Media Asset
        </h2>
        <p className="text-xs text-[#A6A8B0] mt-1 mb-5">
          Upload video files, download packages, trailers, and artwork for movies and series.
        </p>

        {uploadState === 'IDLE' && (
          <form onSubmit={handleStartUpload} className="space-y-4 text-xs">
            {/* Asset Category Selector */}
            <div>
              <label className="block text-[#A6A8B0] font-medium mb-1.5">
                Asset Category *
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAssetKind('STREAMING_VIDEO')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-medium transition-all ${
                    assetKind === 'STREAMING_VIDEO'
                      ? 'bg-[#181A21] text-white border-blue-500/50 shadow-sm shadow-blue-500/10 font-semibold ring-1 ring-blue-500/30'
                      : 'bg-[#111318] text-[#A6A8B0] border-[#262932] hover:text-white hover:bg-[#181A21]'
                  }`}
                >
                  <FileVideo className="w-4 h-4 text-blue-400" />
                  <span>Streaming Video</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssetKind('DOWNLOAD_FILE')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-medium transition-all ${
                    assetKind === 'DOWNLOAD_FILE'
                      ? 'bg-[#181A21] text-white border-emerald-500/50 shadow-sm shadow-emerald-500/10 font-semibold ring-1 ring-emerald-500/30'
                      : 'bg-[#111318] text-[#A6A8B0] border-[#262932] hover:text-white hover:bg-[#181A21]'
                  }`}
                >
                  <FileAudio className="w-4 h-4 text-emerald-400" />
                  <span>Download File</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAssetKind('TRAILER')}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 font-medium transition-all ${
                    assetKind === 'TRAILER'
                      ? 'bg-[#181A21] text-white border-[#D6A84F]/50 shadow-sm shadow-[#D6A84F]/10 font-semibold ring-1 ring-[#D6A84F]/30'
                      : 'bg-[#111318] text-[#A6A8B0] border-[#262932] hover:text-white hover:bg-[#181A21]'
                  }`}
                >
                  <Play className="w-4 h-4 text-[#D6A84F]" />
                  <span>Trailer</span>
                </button>
              </div>
            </div>

            {/* Target Content Title */}
            <div>
              <label className="block text-[#A6A8B0] font-medium mb-1.5">
                Associated Content Title *
              </label>
              <input
                type="text"
                value={associatedTitle}
                onChange={e => setAssociatedTitle(e.target.value)}
                placeholder="e.g. The Beekeeper (2024)"
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#181A21] border border-[#262932] text-white focus:outline-none focus:border-white/30"
              />
            </div>

            {/* Drag & Drop File Zone */}
            <div className="border-2 border-dashed border-[#262932] hover:border-white/30 rounded-2xl p-6 text-center bg-[#181A21]/40 transition-colors">
              <UploadCloud className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="font-semibold text-white">Choose a file or drag & drop here</p>
              <p className="text-[11px] text-gray-500 mt-1">MP4, MKV, MOV, JPG, or PNG up to 10 GB</p>
              <input
                type="file"
                onChange={e => e.target.files && setSelectedFile(e.target.files[0])}
                className="hidden"
                id="file-upload-input"
              />
              <label
                htmlFor="file-upload-input"
                className="mt-3 inline-block px-4 py-2 rounded-xl bg-[#262932] hover:bg-[#262932]/80 text-white font-medium cursor-pointer"
              >
                {selectedFile ? selectedFile.name : 'Select File from Device'}
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#111318] border border-[#262932] hover:bg-[#181A21] text-[#A6A8B0] hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-[#B11226] hover:bg-[#8F0D1E] text-white font-semibold transition-all shadow-md shadow-[#B11226]/20 border border-[#B11226]/40 active:scale-98"
              >
                Start Ingest
              </button>
            </div>
          </form>
        )}

        {(uploadState === 'PREPARING' || uploadState === 'UPLOADING' || uploadState === 'PROCESSING') && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#181A21] border border-[#262932] flex items-center justify-center mx-auto text-white">
              <UploadCloud className="w-6 h-6 animate-pulse" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">
                {uploadState === 'PROCESSING' ? 'Processing Media Asset...' : 'Uploading Asset...'}
              </h3>
              <p className="text-xs text-[#A6A8B0]">
                {uploadState === 'PROCESSING'
                  ? 'Verifying container integrity and generating streaming renditions.'
                  : `${selectedFile?.name || 'master_media_file.mp4'} (${progressPercent}%)`}
              </p>
            </div>

            <div className="w-full bg-[#181A21] border border-[#262932] h-2 rounded-full overflow-hidden max-w-sm mx-auto">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {uploadState === 'COMPLETED' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#10B981]/20 border border-[#10B981]/30 flex items-center justify-center mx-auto text-[#10B981]">
              <CheckCircle2 className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-white text-base">Media Asset Ingest Complete</h3>
              <p className="text-xs text-[#A6A8B0]">
                The asset has been saved and is now ready to attach to catalog releases.
              </p>
            </div>

            <button
              onClick={handleFinish}
              className="px-6 py-2.5 rounded-xl bg-[#10B981] text-white font-semibold text-xs shadow-lg shadow-[#10B981]/20"
            >
              Done & Return to Workspace
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

