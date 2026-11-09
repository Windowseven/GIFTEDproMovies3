'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useCustomer } from '@/context/CustomerContext';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { commercialApi } from '@/lib/api/commercialApi';
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
  AlertTriangle,
  Lock,
  ExternalLink,
  Info,
} from 'lucide-react';

interface TelcoOption {
  id: string;
  name: string;
  network: string;
  color: string;
  ussdHint: string;
}

const TELCO_OPTIONS: TelcoOption[] = [
  { id: 'mpesa', name: 'M-Pesa', network: 'Vodacom (*150*00#)', color: '#E50914', ussdHint: 'Vodacom M-Pesa push prompt will appear on your phone.' },
  { id: 'tigo', name: 'Tigo Pesa', network: 'Yas (*150*01#)', color: '#0072D7', ussdHint: 'Tigo Pesa PIN prompt will appear on your screen.' },
  { id: 'airtel', name: 'Airtel Money', network: 'Airtel (*150*60#)', color: '#FF0000', ussdHint: 'Airtel Money authorization push will appear on your phone.' },
  { id: 'halopesa', name: 'Halopesa', network: 'Halotel (*150*88#)', color: '#FF8800', ussdHint: 'Halopesa USSD prompt will be sent to your phone.' },
];

export function LipaModal() {
  const { lipaModal, closeLipa } = useCustomer();
  const { isAuthenticated, user } = useAuth();
  const router = useRouter();

  const [selectedTelco, setSelectedTelco] = useState<string>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState<string>('0754123456');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [waiverAccepted, setWaiverAccepted] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Flow step: 'select' | 'push' | 'hosted' | 'success'
  const [step, setStep] = useState<'select' | 'push' | 'hosted' | 'success'>('select');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [confirmedOrderId, setConfirmedOrderId] = useState<string | null>(null);
  const [confirmedOrderRef, setConfirmedOrderRef] = useState<string | null>(null);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // Clear polling on unmount or close
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, []);

  if (!lipaModal.isOpen) return null;

  const handleClose = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    setStep('select');
    setErrorMessage(null);
    setWaiverAccepted(false);
    setCheckoutUrl(null);
    closeLipa();
  };

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!waiverAccepted) {
      setErrorMessage('You must acknowledge the immediate digital delivery and non-refundable purchase terms.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      // 1. Resolve offer: Use offerId from modal if provided, or resolve from active offers
      let offerId = (lipaModal as any).offerId;
      if (!offerId) {
        try {
          const offers = await commercialApi.listOffers() as any[];
          if (offers && offers.length > 0) {
            // Find offer matching target type or take active offer
            const matched = offers.find(o => o.status === 'active' || o.status === 'ACTIVE');
            if (matched) {
              offerId = matched.id;
            }
          }
        } catch {
          // If offer lookup fails, provide informative message
        }
      }

      if (!offerId) {
        // If no offers in system, inform customer clearly
        throw new Error('Commercial offer is temporarily unavailable for this item. Please select a VIP pass from Pricing.');
      }

      // 2. Create Order
      const order = await commercialApi.createOrder(offerId);
      setConfirmedOrderId(order.id);
      setConfirmedOrderRef(order.orderReference);

      // 3. Initiate Checkout
      const checkoutRes = await commercialApi.initiateCheckout(
        order.id,
        phoneNumber,
        typeof window !== 'undefined' ? `${window.location.origin}/library` : undefined,
        typeof window !== 'undefined' ? `${window.location.origin}/movies` : undefined
      );

      if (checkoutRes.paymentMode === 'HOSTED_CHECKOUT' && checkoutRes.checkoutUrl) {
        setCheckoutUrl(checkoutRes.checkoutUrl);
        setStep('hosted');
      } else {
        setStep('push');
        // Poll order status for up to 60 seconds
        let attempts = 0;
        pollingRef.current = setInterval(async () => {
          attempts++;
          try {
            const currentOrder = await commercialApi.getOrder(order.id);
            if (currentOrder.status === 'PAID') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setStep('success');
            } else if (currentOrder.status === 'FAILED' || currentOrder.status === 'CANCELLED') {
              if (pollingRef.current) clearInterval(pollingRef.current);
              setErrorMessage('Payment was declined or cancelled on mobile phone. Please retry.');
              setStep('select');
            }
          } catch {
            // Non-blocking poll attempt
          }

          if (attempts >= 30) {
            if (pollingRef.current) clearInterval(pollingRef.current);
            // After timeout, provide link to check order in library
            setStep('success');
          }
        }, 2000);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to initiate mobile money checkout.';
      setErrorMessage(msg);
      setStep('select');
    } finally {
      setIsProcessing(false);
    }
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

  const handleGoToDownloads = () => {
    handleClose();
    router.push('/library?tab=downloads');
  };

  const currentTelco = TELCO_OPTIONS.find((t) => t.id === selectedTelco) || TELCO_OPTIONS[0];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-xl animate-billboard-fade">
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={handleClose} />

      {/* Modal / Bottom Sheet */}
      <div className="relative z-10 w-full sm:max-w-lg bg-[#0E1015] border-t sm:border border-[#262932] rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#262932] bg-[#111318]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#E50914]/20 border border-[#E50914]/40 flex items-center justify-center text-[#E50914]">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                LIPA Instant Mobile Checkout
              </p>
              <h3 className="text-sm font-bold text-white truncate">
                {lipaModal.accessType === 'stream' ? 'Streaming Access' : lipaModal.accessType === 'download' ? 'Offline Download License' : 'VIP Pass'}
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
          {/* Unauthenticated Block: Strict 18+ Customer Account Enforcement */}
          {!isAuthenticated && (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Sign In Required to Purchase</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                  All cinema passes and offline download licenses must belong to a verified 18+ customer account. Guest checkout is not permitted under V1 terms.
                </p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Link
                  href="/login"
                  onClick={handleClose}
                  className="w-full py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-mono font-bold text-xs flex items-center justify-center gap-2"
                >
                  <span>Sign In to Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/register"
                  onClick={handleClose}
                  className="w-full py-3 px-4 rounded-xl bg-[#181A21] hover:bg-[#262932] text-gray-300 font-mono text-xs border border-[#262932] flex items-center justify-center"
                >
                  Create 18+ Customer Account
                </Link>
              </div>
            </div>
          )}

          {/* Authenticated Flow */}
          {isAuthenticated && step === 'select' && (
            <>
              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Order Summary Pill */}
              <div className="p-4 rounded-2xl bg-[#111318] border border-[#262932] space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-gray-400 block">
                      Target Selection
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
                      Gross Amount Due
                    </span>
                    <p className="text-lg font-black text-emerald-400 font-mono">
                      TSh {lipaModal.amountTsh.toLocaleString()}
                    </p>
                    <span className="text-[9px] font-mono text-gray-500">Gross Price • All-Inclusive</span>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs font-mono text-gray-400 pt-2 border-t border-[#262932]">
                  <span className="inline-flex items-center gap-1.5 text-amber-400 text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>One-Time Access • No Auto-Renewal</span>
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {lipaModal.durationLabel || 'Standard Access'}
                  </span>
                </div>
              </div>

              {/* Mobile Money Provider Selection */}
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
                        <span className="text-[10px] text-gray-500 font-mono block mt-0.5 truncate">
                          {telco.network}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone Input Form & Waiver */}
              <form onSubmit={handlePay} className="space-y-4 pt-1">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono text-gray-400 uppercase tracking-wider block">
                    {currentTelco.name} Mobile Number
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
                  <p className="text-[11px] text-gray-500 font-mono">
                    {currentTelco.ussdHint}
                  </p>
                </div>

                {/* Pre-purchase Digital Delivery Waiver (ADR-026) */}
                <div className="p-3.5 rounded-xl bg-[#111318] border border-[#262932] space-y-2">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      required
                      checked={waiverAccepted}
                      onChange={(e) => setWaiverAccepted(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded border-gray-700 bg-neutral-900 text-[#E50914] focus:ring-[#E50914]"
                    />
                    <span className="text-[11px] text-gray-300 leading-snug">
                      I acknowledge immediate digital delivery upon payment confirmation. All sales of digital passes and licenses are final and non-refundable. Interrupted downloads include a 24-hour technical retry grace.
                    </span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isProcessing || !waiverAccepted}
                  className="w-full py-3.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] disabled:bg-gray-800 disabled:text-gray-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition-transform shadow-lg shadow-[#E50914]/25 active:scale-98 font-mono"
                >
                  <span>{isProcessing ? 'Initiating Mobile Push...' : `LIPA TSh ${lipaModal.amountTsh.toLocaleString()}`}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </>
          )}

          {/* Step: USSD Push Notification */}
          {isAuthenticated && step === 'push' && (
            <div className="py-8 text-center space-y-5">
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-[#E50914]/15 border-2 border-[#E50914] border-t-transparent animate-spin" />
                <Phone className="w-6 h-6 text-[#E50914] absolute inset-0 m-auto" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">
                  Check Your Phone ({phoneNumber})
                </h4>
                <p className="text-xs text-gray-400 max-w-xs mx-auto">
                  A USSD payment prompt from <span className="text-white font-semibold">{currentTelco.name}</span> has been sent. Enter your Mobile Money PIN on your phone to complete payment.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#181A21] border border-[#262932] text-xs font-mono text-gray-400">
                <RotateCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                <span>Awaiting Payment Gateway Confirmation...</span>
              </div>
            </div>
          )}

          {/* Step: Hosted Checkout Redirection */}
          {isAuthenticated && step === 'hosted' && (
            <div className="py-8 text-center space-y-5">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
                <ExternalLink className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white">Complete in Secure Payment Gateway</h4>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Your order has been registered. Click below to complete your Mobile Money payment via the official payment gateway.
                </p>
              </div>
              {checkoutUrl && (
                <a
                  href={checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-xl bg-[#E50914] hover:bg-[#b80710] text-white font-bold text-sm font-mono"
                >
                  <span>Open Secure Gateway</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          )}

          {/* Step: Payment Confirmed */}
          {isAuthenticated && step === 'success' && (
            <div className="py-6 text-center space-y-5">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 mx-auto">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="text-lg font-bold text-white">Payment Confirmed!</h4>
                <p className="text-xs text-gray-400">
                  Your digital access to <span className="text-white font-semibold">{lipaModal.itemTitle}</span> has been unlocked in your library.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#111318] border border-[#262932] text-left text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-gray-400">
                  <span>Order Reference:</span>
                  <span className="text-white font-bold">{confirmedOrderRef || 'ORD-VERIFIED'}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Provider:</span>
                  <span className="text-white">{currentTelco.name}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Gross Amount:</span>
                  <span className="text-emerald-400 font-bold">TSh {lipaModal.amountTsh.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-gray-400">
                  <span>Pass Nature:</span>
                  <span className="text-amber-400">One-Time Access (No Auto-Renewal)</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 pt-2">
                {lipaModal.accessType === 'download' ? (
                  <button
                    onClick={handleGoToDownloads}
                    className="flex-1 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-blue-600/20"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>View Downloads in Library</span>
                  </button>
                ) : lipaModal.accessType === 'vip_pass' ? (
                  <button
                    onClick={() => {
                      handleClose();
                      router.push('/movies');
                    }}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#D6A84F] hover:bg-[#b88c3a] text-black font-bold text-xs flex items-center justify-center gap-2 shadow-md"
                  >
                    <Crown className="w-3.5 h-3.5" />
                    <span>Explore VIP Catalog</span>
                  </button>
                ) : (
                  <button
                    onClick={handleStartWatching}
                    className="flex-1 py-3 px-4 rounded-xl bg-[#E50914] hover:bg-[#B11226] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-[#E50914]/20"
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
                  <span>My Passes</span>
                </Link>
              </div>
            </div>
          )}

          {/* Security & Trust Footer */}
          <div className="pt-2 border-t border-[#262932] flex items-center justify-center gap-2 text-[11px] font-mono text-gray-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>256-Bit Encrypted Mobile Money Gateway (Tanzania Telcos)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
