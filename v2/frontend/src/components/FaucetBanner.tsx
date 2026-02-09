"use client";

import { useState, useEffect } from "react";
// FreshWalletWarning is on login page, not here
import { useAutoFaucet } from "@/lib/useAutoFaucet";
import { useAccount } from "wagmi";

export function FaucetBanner() {
  const { address, isConnected } = useAccount();
  const { status, error, balance, ethBalance, isLoading, isReady } = useAutoFaucet();
  if (!isConnected) return null;

  return (
    <>
      {/* Funding in progress */}
      {isLoading && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4">
          <div className="bg-gray-900 border border-emerald-500/30 rounded-lg shadow-xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <div>
                <p className="text-white font-medium">🚰 Funding your wallet...</p>
                <p className="text-gray-400 text-sm">Sending testnet ETH + USDC (no signature needed)</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Funded successfully */}
      {isReady && !isLoading && (
        <FundedToast balance={balance} />
      )}

      {/* Error */}
      {status === "error" && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4">
          <div className="bg-gray-900 border border-red-500/30 rounded-lg shadow-xl p-4">
            <div className="flex items-center gap-3">
              <span className="text-xl">❌</span>
              <div>
                <p className="text-white font-medium">Faucet error</p>
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function FundedToast({ balance }: { balance: string }) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 5000);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm animate-in slide-in-from-bottom-4">
      <div className="bg-gray-900 border border-emerald-500/30 rounded-lg shadow-xl p-4">
        <div className="flex items-center gap-3">
          <span className="text-xl">✅</span>
          <div>
            <p className="text-white font-medium">Wallet funded!</p>
            <p className="text-emerald-400 text-sm">{balance} USDC + ETH for gas</p>
          </div>
        </div>
      </div>
    </div>
  );
}
