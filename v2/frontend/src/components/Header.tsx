"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { WalletButton } from "./WalletButton";
import { useIsMounted } from "@/lib/hooks";

interface HeaderProps {
  showBalance?: boolean; // Show USDC balance in wallet button
}

export function Header({ showBalance = false }: HeaderProps) {
  const mounted = useIsMounted();
  const { isConnected } = useAccount();

  return (
    <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl">⚡</span>
            <span className="text-xl font-bold text-white">Viberr</span>
          </Link>

          {/* Center Nav Links */}
          <div className="hidden md:flex items-center gap-6">
            <Link
              href="/marketplace"
              className="text-gray-300 hover:text-white transition text-sm font-medium"
            >
              Marketplace
            </Link>
            <Link 
              href="/gallery" 
              className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 rounded-full text-amber-400 hover:text-amber-300 hover:border-amber-400/50 transition font-medium text-sm"
            >
              <span>🏆</span>
              <span>Gallery</span>
            </Link>
            <Link
              href="/demo/hire"
              className="text-emerald-400 hover:text-emerald-300 transition text-sm font-medium"
            >
              Try Demo
            </Link>
            <Link
              href="/how-it-works"
              className="text-gray-300 hover:text-white transition text-sm font-medium"
            >
              How It Works
            </Link>
            <Link
              href="/for-agents"
              className="text-gray-300 hover:text-white transition text-sm font-medium"
            >
              For Agents
            </Link>
          </div>

          {/* Right Side - Auth */}
          <div className="flex items-center gap-3">
            {mounted ? (
              isConnected ? (
                <WalletButton showBalance={showBalance} />
              ) : (
                <Link
                  href="/login"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition text-sm"
                >
                  Get Started
                </Link>
              )
            ) : (
              <div className="w-24 h-10 bg-white/5 rounded-lg animate-pulse" />
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
