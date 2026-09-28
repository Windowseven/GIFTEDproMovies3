'use client';

import React, { useState } from 'react';
import { useCustomer } from '@/context/CustomerContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  X,
  CreditCard,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  Film,
  Download,
  Play,
  RotateCw,
  Crown,
} from 'lucide-react';

interface TelcoOption {
  id: string;
  name: string;
  network: string;
  color: string;
  bgColor: string;
}

const TELCO_OPTIONS: TelcoOption[] = [
  { id: 'mpesa', name: 'M-Pesa', network: 'Vodacom', color: '#E50914', bgColor: 'bg-red-500/10 border-red-500/30 text-red-400' },
  { id: 'tigo', name: 'Tigo Pesa', network: 'Yas', color: '#0072D7', bgColor: 'bg-blue-500/10 border-blue-500/30 text-blue-400' },
  { id: 'airtel', name: 'Airtel Money', network: 'Airtel', color: '#FF0000', bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-400' },
  { id: 'halopesa', name: 'Halopesa', network: 'Halotel', color: '#FF8800', bgColor: 'bg-orange-500/10 border-orange-500/30 text-orange-400' },
];

export function LipaModal() {
  const { lipaModal, closeLipa, completePurchase, lastPurchaseSuccess, resetPurchaseState, isAuthenticated } = useCustomer();
  const router = useRouter();
  const [selectedTelco, setSelectedTelco] = useState<string>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState<string>('0754 123 456');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [step, setStep] = useState<'select' | 'push' | 'success'>('select');

  if (!lipaModal.isOpen) return null;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setStep('push');

    await completePurchase(selectedTelco, phoneNumber);
    setIsProcessing(false);
    setStep('success');
  };

  const handleClose = () => {
    resetPurchaseState();
    setStep('select');
    closeLipa();
  };

  const handleStartWatching = () => {
    const slug = lipaModal.itemSlug;
    const dj = lipaModal.djName;
    handleClose();
    if (slug) {
      const djParam = dj ? `?dj=${encodeURIComponent(dj)}` : '';
      router.push(`/watch/${slug}${djParam}`);
    } else {
      router.push('/library');
    }
  };

  const handleDownloadNow = () => {
    // Generate simulated offline file download
    const filename = `${(lipaModal.itemTitle || 'movie').toLowerCase().replace(/[^a-z0-9]+/g, '_')}_offline_package.mp4`;
    const blob = new Blob([`GIFTEDproMovies Offline Package: ${lipaModal.itemTitle} (${lipaModal.djName || 'Swahili DJ Dub'})`], { type: 'video/mp4' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    handleClose();
    router.push('/library?tab=downloads');
  };

  const currentTelco = TELCO_OPTIONS.find((t) => t.id === selectedTelco) || TELCO_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl animate-billboard-fade">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Modal / Bottom Sheet */}
      <div className="relative z-10 w-full sm:max-w-lg bg-[#0E1015] border-t sm:border border-[#262932] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden animate-sheet-up sm:animate-modal-enter">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262932] bg-[#111318]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                LIPA Instant Checkout
              </p>
              <h3 className="text-sm font-bold text-white truncate">
                {lipaModal.accessType === 'stream' ? 'Stream Access' : lipaModal.accessType === 'download' ? 'Offline Download' : 'VIP Subscription'}
              </h3>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-full bg-[#181A21] border border-[#262932] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 max-h-[85vh] overflow-y-auto">
          {step === 'select' && (
            <>
              {/* Optional Guest Auth Notice */}
              {!isAuthenticated && (
                <div className="p-3.5 rounded-2xl bg-[#D6A84F]/10 border border-[#D6A84F]/30 flex items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-[#D6A84F]">Sign in to save your purchase</p>
                    <p className="text-gray-400 text-[11px]">Bind this pass to your account library across devices.</p>
                  </div>
                  <Link
                    href="/login"
                    onClick={handleClose}
                    className="shrink-0 px-3 py-1.5 rounded-xl bg-[#E50914] text-white font-bold text-xs hover:bg-[#B11226] transition-colors"
                  >
                    Sign In
                  </Link>
                </div>
              )}

              {/* Order Summary Pill */}
              <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-gray-400 block">
                      Target Content
                    </span>
                    <h4 className="text-sm font-bold text-white">{lipaModal.itemTitle}</h4>
                    {lipaModal.djName && (
                      <p className="text-xs text-[#D6A84F] font-mono mt-0.5">
                        Commentary: {lipaModal.djName}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-mono uppercase text-gray-400 block">
                      Total Due
                    </span>
                    <p className="text-lg font-black text-emerald-400 font-mono">
                      TSh {lipaModal.amountTsh.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-gray-400 pt-2 border-t border-[#262932]">
                  <span className="flex items-center gap-1">
                    {lipaModal.accessType === 'download' ? (
                      <Download className="w-3.5 h-3.5 text-blue-400" />
                    ) : (
                      <Play className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                    <span>{lipaModal.accessType === 'download' ? 'Offline License' : 'HD Streaming'}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-gray-500" />
                    <span>{lipaModal.durationLabel || '48 Hours Access'}</span>
                  </span>
                </div>
              </div>

              {/* Provider Selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
                  Select Mobile Money Provider
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {TELCO_OPTIONS.map((telco) => {
                    const isSelected = selectedTelco === telco.id;
                    return (
                      <button
                        key={telco.id}
                        type="button"
                        onClick={() => setSelectedTelco(telco.id)}
                        className={`p-3 rounded-2xl border text-left transition-all ${
                          isSelected
                            ? 'bg-[#181A21] border-[#E50914] shadow-lg shadow-[#E50914]/10'
                            : 'bg-[#111318] border-[#262932] hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white">{telco.name}</span>
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: telco.color }}
                          />
                        </div>
                        <span className="text-[11px] text-gray-500 font-mono block mt-0.5">
                          {telco.network}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Input Form */}
              <form onSubmit={handlePay} className="space-y-4 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
                    {currentTelco.name} Phone Number
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="07XX XXX XXX"
                      required
                      className="w-full bg-[#111318] border border-[#262932] focus:border-[#E50914] focus:ring-1 focus:ring-[#E50914] rounded-xl py-3 pl-10 pr-4 text-white text-sm font-mono placeholder:text-gray-600 outline-none transition-all"
                    />
                  </div>
                  <p className="text-[11px] text-gray-500">
                    A secure USSD payment prompt will appear immediately on your device.
                  </p>
                </div>

                <button
                  type="submit"
                  className="w-full py-3.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform shadow-lg shadow-[#E50914]/25 active:scale-98"
                >
                  <span>LIPA TSh {lipaModal.amountTsh.toLocaleString()}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {step === 'push' && (
            <div className="py-8 text-center space-y-5 animate-modal-enter">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#E50914]/15 border-2 border-[#E50914] border-t-transparent animate-spin" />
                <Phone className="w-6 h-6 text-[#E50914] absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  Check Your Phone ({phoneNumber})
                </h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  A payment push from <span className="text-white font-semibold">{currentTelco.name}</span> has been sent. Enter your Mobile Money PIN to complete.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181A21] border border-[#262932] text-xs font-mono text-gray-400">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Awaiting Gateway Confirmation...</span>
              </div>
            </div>
          )}

          {step === 'success' && (
            <div className="py-6 text-center space-y-5 animate-modal-enter">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Payment Confirmed!</h4>
                <p className="text-xs text-gray-400">
                  Your access to <span className="text-white font-semibold">{lipaModal.itemTitle}</span> has been instantly unlocked.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#111318] border border-[#262932] text-left text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span>Transaction Status:</span>
                  <span className="text-emerald-400 font-bold">SETTLED</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Provider:</span>
                  <span className="text-white">{currentTelco.name}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Receipt ID:</span>
                  <span className="text-white">TZS-{Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {lipaModal.accessType === 'download' ? (
                  <button
                    onClick={handleDownloadNow}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02]"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Movie Now</span>
                  </button>
                ) : lipaModal.accessType === 'vip_pass' ? (
                  <button
                    onClick={() => {
                      handleClose();
                      router.push('/movies');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#D6A84F] hover:bg-[#b88c3a] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all hover:scale-[1.02]"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Explore VIP Catalog</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartWatching}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#E50914]/20 transition-all hover:scale-[1.02]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start Watching Now</span>
                  </button>
                )}
                <Link
                  href="/library"
                  onClick={handleClose}
                  className="py-3 px-4 rounded-xl bg-[#181A21] hover:bg-[#262932] text-gray-300 font-semibold text-xs border border-[#262932] flex items-center justify-center"
                >
                  <span>View in Library</span>
                </Link>
              </div>
            </div>
          )}

          {/* Security & Trust Footer */}
          <div className="pt-2 border-t border-[#262932] flex items-center justify-center gap-2 text-[11px] font-mono text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit Encrypted Mobile Money Gateway</span>
          </div>
        </div>
      </div>
    </div>
  );
}
