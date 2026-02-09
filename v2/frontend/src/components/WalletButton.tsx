"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useReadContract } from "wagmi";
import { CONTRACTS, ERC20_ABI, USDC_DECIMALS } from "@/lib/wagmi";
import { useAutoFaucet } from "@/lib/useAutoFaucet";

interface WalletButtonProps {
  showBalance?: boolean; // Show USDC balance (default: false)
  compact?: boolean; // Compact mode for headers
}

function USDCBalance() {
  const { address } = useAccount();
  const { balance, status } = useAutoFaucet();
  
  // Use faucet balance if available, otherwise read from chain
  const { data: chainBalance } = useReadContract({
    address: CONTRACTS.USDC as `0x${string}`,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 10000 },
  });

  const displayBalance = balance !== "..." ? balance : 
    chainBalance !== undefined ? (Number(chainBalance) / 10 ** USDC_DECIMALS).toFixed(0) : "...";
  
  const isLoading = status === "checking" || status === "funding";
  
  return (
    <div className="bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg font-medium flex items-center gap-2 border border-emerald-500/20">
      {isLoading ? (
        <>
          <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm">Loading...</span>
        </>
      ) : (
        <>
          <span className="text-sm">💵</span>
          <span>{displayBalance} USDC</span>
        </>
      )}
    </div>
  );
}

export function WalletButton({ showBalance = false, compact = false }: WalletButtonProps) {
  // Trigger auto-faucet on mount when connected
  useAutoFaucet();
  
  return (
    <ConnectButton.Custom>
      {({
        account,
        chain,
        openAccountModal,
        openChainModal,
        openConnectModal,
        mounted,
      }) => {
        const ready = mounted;
        const connected = ready && account && chain;

        return (
          <div
            {...(!ready && {
              "aria-hidden": true,
              style: {
                opacity: 0,
                pointerEvents: "none",
                userSelect: "none",
              },
            })}
          >
            {(() => {
              if (!connected) {
                return (
                  <button
                    onClick={openConnectModal}
                    type="button"
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    <svg
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Connect Wallet
                  </button>
                );
              }

              if (chain.unsupported) {
                return (
                  <button
                    onClick={openChainModal}
                    type="button"
                    className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition"
                  >
                    Wrong Network
                  </button>
                );
              }

              // Connected state - clean and simple
              return (
                <div className="flex items-center gap-2">
                  {/* USDC Balance - only show when requested */}
                  {showBalance && <USDCBalance />}
                  
                  {/* Account button - always show */}
                  <button
                    onClick={openAccountModal}
                    type="button"
                    className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg font-medium transition flex items-center gap-2"
                  >
                    {/* Chain icon */}
                    {chain.hasIcon && chain.iconUrl && (
                      <img
                        alt={chain.name ?? "Chain"}
                        src={chain.iconUrl}
                        className="w-4 h-4"
                      />
                    )}
                    {/* Address */}
                    <span className="text-emerald-400">{account.displayName}</span>
                  </button>
                </div>
              );
            })()}
          </div>
        );
      }}
    </ConnectButton.Custom>
  );
}
