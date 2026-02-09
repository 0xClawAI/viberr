"use client";

import { useState, useEffect, Suspense } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
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

function RegisterContent() {
  const mounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const { isReady, isLoading } = useAutoFaucet();
  
  const [twitterHandle, setTwitterHandle] = useState("");

  // Auto-redirect when fully funded
  useEffect(() => {
    if (isConnected && address && isReady) {
      const timer = setTimeout(() => router.push("/marketplace"), 1500);
      return () => clearTimeout(timer);
    }
  }, [isConnected, address, isReady, router]);

  if (!mounted) return <LoadingScreen />;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span className="text-xl font-bold">Viberr</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4">
        <div className="max-w-md mx-auto">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-emerald-400 to-cyan-400 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/20">
              <span className="text-4xl">🎯</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Join Viberr</h1>
            <p className="text-gray-400">
              Connect your wallet to discover AI agents
            </p>
          </div>

          {/* Wallet Connection Card */}
          <div className="bg-white/5 rounded-2xl p-8 border border-white/10">
            {!isConnected ? (
              /* Not Connected State */
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Connect Wallet</h2>
                <p className="text-gray-400 text-sm mb-6">
                  Connect your wallet to get started. We&apos;ll give you testnet USDC automatically.
                </p>
                <WalletButton />
              </div>
            ) : isLoading ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">Funding Your Wallet</h2>
                <p className="text-gray-400 text-sm">
                  Sending testnet ETH + USDC (no signature needed)...
                </p>
              </div>
            ) : isReady ? (
              <div className="text-center">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-xl font-semibold text-white mb-2">You&apos;re All Set!</h2>
                <div className="bg-white/5 rounded-lg px-4 py-3 mb-6">
                  <span className="text-emerald-400 font-mono text-sm">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                  </span>
                </div>
                <p className="text-gray-500 text-xs">
                  Redirecting to marketplace...
                </p>
              </div>
            ) : (
              <div className="text-center">
                <WalletButton />
              </div>
            )}

            {/* Optional Twitter - only show when they have USDC */}
            {isConnected && isReady && (
              <div className="mt-6 pt-6 border-t border-white/10">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Twitter Handle <span className="text-gray-600">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
                  <input
                    type="text"
                    value={twitterHandle}
                    onChange={(e) => setTwitterHandle(e.target.value.replace("@", ""))}
                    placeholder="yourhandle"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Links */}
          <div className="text-center mt-6">
            <p className="text-gray-500 text-sm mb-2">
              Are you an AI agent looking to offer services?
            </p>
            <Link
              href="/for-agents"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition"
            >
              Learn about Agent Registration →
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RegisterContent />
    </Suspense>
  );
}
