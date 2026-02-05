"use client";

import { useState, useEffect } from "react";
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
  onSuccess?: (jobId: string) => void;
}

type TxStatus = "idle" | "approving" | "approved" | "funding" | "success" | "error";

export function PaymentStep({
  servicePrice,
  serviceName,
  agentName,
  agentId,
  onSuccess,
}: PaymentStepProps) {
  const { address, isConnected } = useAccount();
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Calculate prices
  const platformFee = servicePrice * (PLATFORM_FEE_PERCENT / 100);
  const totalPrice = servicePrice + platformFee;
  const totalPriceWei = parseUnits(totalPrice.toString(), USDC_DECIMALS);

  // Read USDC balance
  const { data: usdcBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Read current allowance
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: CONTRACTS.USDC,
    abi: ERC20_ABI,
    functionName: "allowance",
    args: address ? [address, CONTRACTS.ESCROW] : undefined,
    query: {
      enabled: !!address,
    },
  });

  // Format balance for display
  const formattedBalance = usdcBalance
    ? parseFloat(formatUnits(usdcBalance, USDC_DECIMALS)).toFixed(2)
    : "0.00";

  // Check if has enough balance
  const hasEnoughBalance = usdcBalance ? usdcBalance >= totalPriceWei : false;

  // Check if already approved
  const isApproved = currentAllowance ? currentAllowance >= totalPriceWei : false;

  // Write contract hooks
  const { writeContract: approveWrite, data: approveData, isPending: isApprovePending, error: approveError, reset: resetApprove } = useWriteContract();
  const { writeContract: fundWrite, data: fundData, isPending: isFundPending, error: fundError, reset: resetFund } = useWriteContract();

  // Use data directly as tx hash

  // Wait for approve transaction
  const { isLoading: isApproveConfirming, isSuccess: isApproveSuccess } = useWaitForTransactionReceipt({
    hash: approveData,
  });

  // Wait for fund transaction
  const { isLoading: isFundConfirming, isSuccess: isFundSuccess } = useWaitForTransactionReceipt({
    hash: fundData,
  });

  // Handle approve success - refetch allowance when transaction succeeds
  useEffect(() => {
    if (isApproveSuccess) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- responding to external tx confirmation
      setTxStatus("approved");
      refetchAllowance();
    }
  }, [isApproveSuccess, refetchAllowance]);

  // Handle fund success - call onSuccess callback and refetch balance
  useEffect(() => {
    if (isFundSuccess) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- responding to external tx confirmation
      setTxStatus("success");
      refetchBalance();
      if (onSuccess) {
        onSuccess(fundData || "mock-job-id");
      }
    }
  }, [isFundSuccess, refetchBalance, onSuccess, fundData]);

  // Handle errors from contract writes
  useEffect(() => {
    if (approveError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- responding to external error
      setTxStatus("error");
      setErrorMessage(approveError.message || "Approval failed");
    }
  }, [approveError]);

  useEffect(() => {
    if (fundError) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- responding to external error
      setTxStatus("error");
      setErrorMessage(fundError.message || "Transaction failed");
    }
  }, [fundError]);

  // Approve USDC
  const handleApprove = () => {
    setTxStatus("approving");
    setErrorMessage(null);
    approveWrite({
      address: CONTRACTS.USDC,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [CONTRACTS.ESCROW, totalPriceWei],
    });
  };

  // Fund escrow
  const handleFund = () => {
    setTxStatus("funding");
    setErrorMessage(null);
    fundWrite({
      address: CONTRACTS.ESCROW,
      abi: ESCROW_ABI,
      functionName: "createJob",
      args: [agentId, totalPriceWei],
    });
  };

  // Reset and retry
  const handleRetry = () => {
    setTxStatus("idle");
    setErrorMessage(null);
    resetApprove();
    resetFund();
    refetchBalance();
    refetchAllowance();
  };

  // Determine button state
  const isProcessing =
    isApprovePending ||
    isApproveConfirming ||
    isFundPending ||
    isFundConfirming;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-emerald-400"
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
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Secure Payment</h2>
        <p className="text-gray-400">
          Fund your escrow to start working with {agentName}
        </p>
      </div>

      {/* Wallet Connection */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-4">
        <div className="flex items-center justify-between">
          <span className="text-gray-400">Wallet</span>
          <WalletButton />
        </div>
        {isConnected && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">USDC Balance</span>
              <span
                className={`font-medium ${
                  hasEnoughBalance ? "text-emerald-400" : "text-red-400"
                }`}
              >
                ${formattedBalance} USDC
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Price Breakdown */}
      <div className="bg-[#111] border border-white/10 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Price Breakdown</h3>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Service</span>
            <span className="text-white">{serviceName}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Agent</span>
            <span className="text-white">{agentName}</span>
          </div>

          <div className="border-t border-white/10 my-4" />

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Service Price</span>
            <span className="text-white">${servicePrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-400">Platform Fee ({PLATFORM_FEE_PERCENT}%)</span>
            <span className="text-white">${platformFee.toFixed(2)}</span>
          </div>

          <div className="border-t border-white/10 my-4" />

          <div className="flex items-center justify-between">
            <span className="text-lg font-semibold text-white">Total</span>
            <span className="text-2xl font-bold text-emerald-400">
              ${totalPrice.toFixed(2)} USDC
            </span>
          </div>
        </div>
      </div>

      {/* Transaction Status */}
      {txStatus !== "idle" && (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">
            Transaction Status
          </h3>

          {/* Status Steps */}
          <div className="space-y-4">
            {/* Approve Step */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  txStatus === "approving" || isApproveConfirming
                    ? "bg-emerald-500/20"
                    : isApproved || txStatus === "approved" || txStatus === "funding" || txStatus === "success"
                    ? "bg-emerald-500"
                    : "bg-white/10"
                }`}
              >
                {txStatus === "approving" || isApproveConfirming ? (
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : isApproved || txStatus === "approved" || txStatus === "funding" || txStatus === "success" ? (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="text-gray-500">1</span>
                )}
              </div>
              <div>
                <p
                  className={`font-medium ${
                    txStatus === "approving" || isApproveConfirming
                      ? "text-emerald-400"
                      : isApproved || txStatus === "approved" || txStatus === "funding" || txStatus === "success"
                      ? "text-white"
                      : "text-gray-500"
                  }`}
                >
                  Approve USDC
                </p>
                <p className="text-sm text-gray-500">
                  {txStatus === "approving" || isApproveConfirming
                    ? "Confirming..."
                    : isApproved || txStatus === "approved" || txStatus === "funding" || txStatus === "success"
                    ? "Approved"
                    : "Pending"}
                </p>
              </div>
            </div>

            {/* Fund Step */}
            <div className="flex items-center gap-3">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  txStatus === "funding" || isFundConfirming
                    ? "bg-emerald-500/20"
                    : txStatus === "success"
                    ? "bg-emerald-500"
                    : "bg-white/10"
                }`}
              >
                {txStatus === "funding" || isFundConfirming ? (
                  <div className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                ) : txStatus === "success" ? (
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  <span className="text-gray-500">2</span>
                )}
              </div>
              <div>
                <p
                  className={`font-medium ${
                    txStatus === "funding" || isFundConfirming
                      ? "text-emerald-400"
                      : txStatus === "success"
                      ? "text-white"
                      : "text-gray-500"
                  }`}
                >
                  Fund Escrow
                </p>
                <p className="text-sm text-gray-500">
                  {txStatus === "funding" || isFundConfirming
                    ? "Confirming..."
                    : txStatus === "success"
                    ? "Complete"
                    : "Pending"}
                </p>
              </div>
            </div>
          </div>

          {/* Success Message */}
          {txStatus === "success" && (
            <div className="mt-6 p-4 bg-emerald-500/20 border border-emerald-500/30 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div>
                  <p className="font-semibold text-emerald-400">
                    Payment Successful!
                  </p>
                  <p className="text-sm text-gray-400">
                    Your escrow has been funded. Redirecting to dashboard...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {txStatus === "error" && errorMessage && (
            <div className="mt-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-6 h-6 text-red-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-400">Transaction Failed</p>
                  <p className="text-sm text-gray-400 mt-1 break-words">
                    {errorMessage.length > 100
                      ? errorMessage.slice(0, 100) + "..."
                      : errorMessage}
                  </p>
                  <button
                    onClick={handleRetry}
                    className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {!isConnected ? (
        <div className="bg-[#111] border border-emerald-500/30 rounded-xl p-6 text-center animate-fade-in">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Connect Wallet to Continue</h3>
          <p className="text-gray-400 text-sm mb-4">
            Connect your wallet to fund the escrow and start your project with {agentName}.
          </p>
          <WalletButton />
        </div>
      ) : !hasEnoughBalance ? (
        <div className="text-center py-4">
          <p className="text-red-400 mb-2">Insufficient USDC balance</p>
          <p className="text-gray-500 text-sm">
            You need at least ${totalPrice.toFixed(2)} USDC to fund this escrow
          </p>
        </div>
      ) : txStatus === "success" ? (
        <button
          onClick={() => (window.location.href = "/dashboard")}
          className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2"
        >
          Go to Dashboard
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
              d="M13 7l5 5m0 0l-5 5m5-5H6"
            />
          </svg>
        </button>
      ) : (isApproved || txStatus === "approved") && txStatus !== "funding" ? (
        <button
          onClick={handleFund}
          disabled={isProcessing}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2"
        >
          {isFundPending || isFundConfirming ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Processing...
            </>
          ) : (
            <>
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
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
              Fund Escrow (${totalPrice.toFixed(2)} USDC)
            </>
          )}
        </button>
      ) : (
        <button
          onClick={handleApprove}
          disabled={isProcessing || txStatus === "error"}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white py-4 rounded-xl font-semibold transition flex items-center justify-center gap-2"
        >
          {isApprovePending || isApproveConfirming ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Approving...
            </>
          ) : (
            <>
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
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              Approve USDC
            </>
          )}
        </button>
      )}

      {/* Security Note */}
      <p className="text-gray-500 text-sm text-center">
        🔒 Your payment is protected by escrow until you approve the work
      </p>
    </div>
  );
}
