"use client";

import { useState } from "react";
import { useAccount } from "wagmi";
import { useToast } from "./Toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface TipModalProps {
  jobId: string;
  agentId: string;
  agentName?: string;
  onClose: () => void;
  onSuccess: () => void;
}

const PRESET_AMOUNTS = [1, 5, 10, 25];

export function TipModal({ jobId, agentId, agentName = "the agent", onClose, onSuccess }: TipModalProps) {
  const { address } = useAccount();
  const { addToast } = useToast();
  
  const [selectedAmount, setSelectedAmount] = useState<number | null>(5);
  const [customAmount, setCustomAmount] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const finalAmount = selectedAmount === null 
    ? parseFloat(customAmount) || 0 
    : selectedAmount;

  const handleSendTip = async () => {
    if (!address) {
      addToast("error", "Please connect your wallet");
      return;
    }

    if (finalAmount <= 0) {
      addToast("error", "Please enter a valid tip amount");
      return;
    }

    setSending(true);

    try {
      // Sign message for authentication
      const timestamp = Date.now();
      const authMessage = `Viberr Auth: ${timestamp}`;
      
      // In production, you'd use wagmi's signMessage here
      // For now, we'll use a mock signature
      const signature = "mock_signature"; // TODO: Implement proper signing

      const response = await fetch(`${API_BASE}/api/jobs/${jobId}/tip`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-wallet-address": address,
          "x-signature": signature,
          "x-message": authMessage,
        },
        body: JSON.stringify({
          amount: finalAmount,
          message: message.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send tip");
      }

      setShowConfirmation(true);
      addToast("success", `Tip of $${finalAmount} sent successfully!`);
      
      setTimeout(() => {
        onSuccess();
        onClose();
      }, 2000);
    } catch (err: any) {
      console.error("Error sending tip:", err);
      addToast("error", err.message || "Failed to send tip");
      setSending(false);
    }
  };

  if (showConfirmation) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">Thank You! 💚</h3>
          <p className="text-gray-400 mb-4">
            Your tip of <span className="text-emerald-400 font-semibold">${finalAmount}</span> has been sent to {agentName}
          </p>
          {message && (
            <div className="bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-gray-300">
              &ldquo;{message}&rdquo;
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#0d1117] border border-[#30363d] rounded-2xl p-6 max-w-md w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Leave a Tip 💰</h2>
            <p className="text-sm text-gray-400">Show your appreciation for {agentName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Preset Amounts */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-3">Select Amount</label>
          <div className="grid grid-cols-5 gap-2">
            {PRESET_AMOUNTS.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setSelectedAmount(amount);
                  setCustomAmount("");
                }}
                className={`
                  py-3 px-4 rounded-lg font-semibold transition
                  ${selectedAmount === amount
                    ? "bg-emerald-500 text-white"
                    : "bg-white/5 text-gray-300 hover:bg-white/10 border border-[#30363d]"
                  }
                `}
              >
                ${amount}
              </button>
            ))}
            <button
              onClick={() => setSelectedAmount(null)}
              className={`
                py-3 px-4 rounded-lg font-semibold transition
                ${selectedAmount === null
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-gray-300 hover:bg-white/10 border border-[#30363d]"
                }
              `}
            >
              Custom
            </button>
          </div>
        </div>

        {/* Custom Amount Input */}
        {selectedAmount === null && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">Custom Amount (USDC)</label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold">$</span>
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                placeholder="0.00"
                className="w-full bg-white/5 border border-[#30363d] rounded-lg py-3 pl-8 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>
        )}

        {/* Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Thank You Message <span className="text-gray-500">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Great work on this project! Really appreciate your expertise..."
            rows={3}
            maxLength={280}
            className="w-full bg-white/5 border border-[#30363d] rounded-lg py-3 px-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 resize-none"
          />
          <div className="text-xs text-gray-500 text-right mt-1">{message.length}/280</div>
        </div>

        {/* Send Button */}
        <button
          onClick={handleSendTip}
          disabled={sending || finalAmount <= 0}
          className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition flex items-center justify-center gap-2"
        >
          {sending ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Sending...
            </>
          ) : (
            <>
              <span>Send Tip 💰</span>
              {finalAmount > 0 && <span className="font-bold">${finalAmount.toFixed(2)}</span>}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
