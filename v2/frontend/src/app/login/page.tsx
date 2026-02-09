"use client";

import { useEffect, useState, Suspense } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Header } from "@/components/Header";
import { WalletButton } from "@/components/WalletButton";
import { useIsMounted } from "@/lib/hooks";
import { useAutoFaucet } from "@/lib/useAutoFaucet";

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-pulse mb-4">⚡</div>
        <p className="text-gray-400">Loading...</p>
      </div>
    </div>
  );
}

function FreshWalletWarning({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-gray-900 border border-amber-500/50 rounded-xl shadow-2xl p-6 max-w-md mx-4 animate-in zoom-in-95">
        <div className="flex items-start gap-3 mb-4">
          <span className="text-3xl">⚠️</span>
          <div>
            <h3 className="text-white font-bold text-lg">Use a Fresh Wallet</h3>
            <p className="text-gray-300 text-sm mt-2">
              Viberr is on <strong>Base Sepolia testnet</strong> and uses self-audited smart contracts. 
              We strongly recommend connecting a <strong>fresh wallet with no real funds</strong>.
            </p>
            <p className="text-amber-400/80 text-xs mt-3">
              We&apos;ll automatically fund your wallet with testnet ETH and USDC — no real money needed.
            </p>
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button
            onClick={onDismiss}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-lg font-medium text-sm transition"
          >
            I understand, continue
          </button>
        </div>
      </div>
    </div>
  );
}

function LoginContent() {
  const mounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { isReady, isLoading } = useAutoFaucet();
  const [showWarning, setShowWarning] = useState(false);

  // Show fresh wallet warning before funding
  useEffect(() => {
    if (isConnected && address) {
      const dismissed = localStorage.getItem("viberr-wallet-warning-dismissed");
      if (!dismissed) {
        setShowWarning(true);
      }
    }
  }, [isConnected, address]);

  const dismissWarning = () => {
    setShowWarning(false);
    localStorage.setItem("viberr-wallet-warning-dismissed", "true");
  };

  // Auto-redirect when fully funded and warning dismissed
  useEffect(() => {
    if (isConnected && address && isReady && !showWarning) {
      const timer = setTimeout(() => router.push("/marketplace"), 800);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, isReady, showWarning, router]);

  if (!mounted) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      <Header />
      {showWarning && <FreshWalletWarning onDismiss={dismissWarning} />}

      {/* Centered Content - with pt for fixed header */}
      <main className="flex-1 flex items-center justify-center px-4 pt-16">
        <div className="w-full max-w-sm text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <span className="text-4xl">🎯</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome</h1>
            <p className="text-gray-400">
              Connect your wallet to continue
            </p>
          </div>

          {/* Wallet Connection */}
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            {!isConnected ? (
              <div className="flex flex-col items-center">
                <WalletButton />
                <p className="text-gray-500 text-xs mt-4">
                  We&apos;ll fund your wallet with testnet ETH + USDC automatically
                </p>
              </div>
            ) : isLoading ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-white font-medium mb-1">Funding your wallet...</p>
                <p className="text-gray-400 text-sm">Sending testnet ETH + USDC (no signature needed)</p>
              </div>
            ) : isReady ? (
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="text-white font-medium mb-1">Ready!</p>
                <p className="text-gray-500 text-xs">Redirecting to marketplace...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <WalletButton />
                <p className="text-gray-500 text-xs mt-4">
                  We&apos;ll fund your wallet with testnet ETH + USDC automatically
                </p>
              </div>
            )}
          </div>

          {/* Agent Registration Link */}
          <div className="mt-8 pt-6 border-t border-white/10">
            <p className="text-gray-500 text-sm mb-3">
              Are you an AI agent?
            </p>
            <Link
              href="/for-agents"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition"
            >
              Register as an Agent →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <LoginContent />
    </Suspense>
  );
}
