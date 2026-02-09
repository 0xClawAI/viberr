"use client";

import { useState, useEffect, useCallback } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { parseUnits, formatUnits } from "viem";
import { WalletButton } from "./WalletButton";
import {
  CONTRACTS,
  PLATFORM_FEE_PERCENT,
  USDC_DECIMALS,
  ERC20_ABI,
  ESCROW_ABI,
} from "@/lib/wagmi";

interface PaymentStepProps {
  servicePrice: number;
  serviceName: string;
  agentName: string;
  agentId: string;
  agentWallet: `0x${string}`;
  specHash?: `0x${string}`;
  onSuccess?: (jobId: string) => void;
}

const ZERO_HASH = "0x0000000000000000000000000000000000000000000000000000000000000000" as `0x${string}`;

export function PaymentStep({
  servicePrice,
  serviceName,
  agentName,
  agentId,
  agentWallet,
  specHash = ZERO_HASH,
  onSuccess,
}: PaymentStepProps) {
  const { address, isConnected } = useAccount();
  const [status, setStatus] = useState<"idle" | "paying" | "funding" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createdJobId, setCreatedJobId] = useState<bigint | null>(null);

  const platformFee = servicePrice * (PLATFORM_FEE_PERCENT / 100);
  const totalPrice = servicePrice + platformFee;
  const totalPriceWei = parseUnits(totalPrice.toString(), USDC_DECIMALS);

  const { data: usdcBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  const { data: currentAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.ESCROW] : undefined,
    query: { enabled: !!address },
  });

  const formattedBalance = usdcBalance ? parseFloat(formatUnits(usdcBalance, USDC_DECIMALS)).toFixed(2) : "0.00";
  const hasEnoughBalance = usdcBalance ? usdcBalance >= totalPriceWei : false;
  const isApproved = currentAllowance ? currentAllowance >= totalPriceWei : false;

  // Contract write hooks — only approve + createJob (createJob pulls funds atomically)
  const { writeContract: approveWrite, data: approveHash, isPending: isApprovePending, error: approveError } = useWriteContract();
  const { writeContract: createJobWrite, data: createHash, isPending: isCreatePending, error: createError } = useWriteContract();

  const { isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { isSuccess: isCreateSuccess, data: createReceipt } = useWaitForTransactionReceipt({ hash: createHash });

  // Create job — now also pulls USDC in one tx
  const startCreateJob = useCallback(() => {
    setStatus("paying");
    createJobWrite({
      address: CONTRACTS.ESCROW as `0x${string}`,
      abi: ESCROW_ABI,
      functionName: "createJob",
      args: [agentWallet, totalPriceWei, specHash],
    });
  }, [createJobWrite, agentWallet, totalPriceWei, specHash]);

  // Chain: approve success → create job
  useEffect(() => {
    if (isApproveSuccess) startCreateJob();
  }, [isApproveSuccess, startCreateJob]);

  // Create success → done (funds already pulled)
  useEffect(() => {
    if (isCreateSuccess && createReceipt) {
      const escrowLogs = createReceipt.logs.filter(
        log => log.address.toLowerCase() === (CONTRACTS.ESCROW as string).toLowerCase()
      );
      const jobCreatedLog = escrowLogs[0];
      if (jobCreatedLog?.topics[1]) {
        const jobId = BigInt(jobCreatedLog.topics[1]);
        setCreatedJobId(jobId);
      }
      setStatus("success");
      if (onSuccess && createReceipt) {
        const log = escrowLogs[0];
        const id = log?.topics[1] ? BigInt(log.topics[1]).toString() : "0";
        setTimeout(() => onSuccess(id), 1500);
      }
    }
  }, [isCreateSuccess, createReceipt, onSuccess]);

  // Handle errors
  useEffect(() => {
    const err = approveError || createError;
    if (err) {
      setStatus("error");
      setErrorMessage(err.message?.slice(0, 100) || "Transaction failed");
    }
  }, [approveError, createError]);

  // One-click pay: approve if needed, then createJob (which pulls funds)
  const handlePay = () => {
    setStatus("paying");
    setErrorMessage(null);

    if (isApproved) {
      startCreateJob();
    } else {
      approveWrite({
        address: CONTRACTS.USDC as `0x${string}`,
        abi: ERC20_ABI,
        functionName: "approve",
        args: [CONTRACTS.ESCROW as `0x${string}`, totalPriceWei],
      });
    }
  };

  const isProcessing = status === "paying" || isApprovePending || isCreatePending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🔒</span>
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Escrow Payment</h2>
        <p className="text-gray-400">
          Funds held in escrow until you approve the work
        </p>
      </div>

      {/* Price Card */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400">{serviceName}</span>
          <span className="text-white">${servicePrice.toFixed(2)}</span>
        </div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-gray-400">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
          <span className="text-white">${platformFee.toFixed(2)}</span>
        </div>
        <div className="border-t border-white/10 my-3" />
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold text-white">Total</span>
          <span className="text-2xl font-bold text-emerald-400">${totalPrice.toFixed(2)} USDC</span>
        </div>
        {isConnected && (
          <div className="mt-3 pt-3 border-t border-white/10 flex justify-between">
            <span className="text-gray-500 text-sm">Your balance</span>
            <span className={`text-sm font-medium ${hasEnoughBalance ? "text-emerald-400" : "text-red-400"}`}>
              ${formattedBalance} USDC
            </span>
          </div>
        )}
      </div>

      {/* Progress */}
      {status !== "idle" && status !== "error" && (
        <div className="bg-[#111] border border-emerald-500/20 rounded-xl p-4">
          <div className="flex items-center gap-3">
            {status === "success" ? (
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            ) : (
              <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
            )}
            <div>
              <p className="text-white font-medium">
                {status === "paying" ? "Processing payment..." : status === "funding" ? "Funding escrow..." : "Payment complete!"}
              </p>
              <p className="text-gray-500 text-sm">
                {status === "success" ? "Redirecting..." : "Please confirm in your wallet"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
          <p className="text-red-400 font-medium">Transaction failed</p>
          <p className="text-gray-400 text-sm mt-1">{errorMessage}</p>
          <button onClick={() => { setStatus("idle"); setErrorMessage(null); }} className="mt-3 text-emerald-400 text-sm hover:text-emerald-300">
            ↻ Try again
          </button>
        </div>
      )}

      {/* Action Button */}
      {!isConnected ? (
        <div className="text-center">
          <WalletButton showBalance={true} />
        </div>
      ) : !hasEnoughBalance ? (
        <div className="text-center py-4">
          <p className="text-red-400">Insufficient balance (need ${totalPrice.toFixed(2)} USDC)</p>
        </div>
      ) : status === "idle" || status === "error" ? (
        <button
          onClick={handlePay}
          disabled={isProcessing}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2"
        >
          Pay ${totalPrice.toFixed(2)} USDC
        </button>
      ) : null}

      <p className="text-gray-500 text-xs text-center">
        🔒 Protected by on-chain escrow on Base Sepolia
      </p>
    </div>
  );
}
