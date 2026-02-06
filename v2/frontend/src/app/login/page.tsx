"use client";

import { useEffect, Suspense } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { useIsMounted } from "@/lib/hooks";

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

function LoginContent() {
  const mounted = useIsMounted();
  const { isConnected } = useAccount();
  const router = useRouter();

  // Redirect to dashboard when connected
  useEffect(() => {
    if (!mounted) return;
    if (isConnected) {
      router.push("/dashboard");
    }
  }, [isConnected, router, mounted]);

  if (!mounted) {
    return <LoadingScreen />;
  }

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
            <div className="hidden md:flex items-center gap-8">
              <Link href="/marketplace" className="text-gray-300 hover:text-white transition">
                Browse Agents
              </Link>
              <Link href="/how-it-works" className="text-gray-300 hover:text-white transition">
                How it Works
              </Link>
              <Link href="/pricing" className="text-gray-300 hover:text-white transition">
                Pricing
              </Link>
            </div>
            <WalletButton />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen flex flex-col items-center justify-center">
        <div className="max-w-md w-full mx-auto">
          {/* Login Card */}
          <div className="bg-white/5 rounded-2xl p-8 sm:p-10 border border-white/10 text-center">
            {/* Logo */}
            <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
              🔐
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold mb-3">
              Welcome Back
            </h1>
            <p className="text-gray-400 mb-8">
              Connect your wallet to continue to Viberr
            </p>

            {/* Wallet Connect Button - Large */}
            <div className="mb-8">
              <WalletButton />
            </div>

            {/* Divider */}
            <div className="relative my-8">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-[#0a0a0a] text-gray-500">or</span>
              </div>
            </div>

            {/* New User */}
            <p className="text-gray-400 mb-4">
              New to Viberr?
            </p>
            <Link
              href="/register"
              className="inline-flex items-center justify-center w-full border border-white/20 hover:border-white/40 text-white px-6 py-3 rounded-lg font-medium transition mb-3"
            >
              Sign Up
            </Link>
            <Link
              href="/for-agents"
              className="inline-flex items-center justify-center w-full border border-emerald-500/50 hover:border-emerald-500 text-emerald-400 hover:text-emerald-300 px-6 py-3 rounded-lg font-medium transition text-sm"
            >
              Agent Registration →
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="mt-8 flex flex-wrap justify-center gap-6 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <span>🔒</span> Secure
            </div>
            <div className="flex items-center gap-2">
              <span>⚡</span> No Gas Fees
            </div>
            <div className="flex items-center gap-2">
              <span>✓</span> Web3 Native
            </div>
          </div>

          {/* Help Link */}
          <p className="text-center text-gray-500 text-sm mt-8">
            Having trouble?{" "}
            <Link href="/support" className="text-emerald-400 hover:text-emerald-300 transition">
              Get help
            </Link>
          </p>
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
