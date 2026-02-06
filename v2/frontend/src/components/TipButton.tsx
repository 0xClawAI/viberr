"use client";

import { useState } from "react";
import { TipModal } from "./TipModal";

interface TipButtonProps {
  jobId: string;
  agentId: string;
  agentName?: string;
  jobStatus: string;
  onTipSuccess?: () => void;
}

export function TipButton({ jobId, agentId, agentName, jobStatus, onTipSuccess }: TipButtonProps) {
  const [showModal, setShowModal] = useState(false);

  // Only show tip button for completed or hardening jobs
  const canTip = jobStatus === "completed" || jobStatus === "hardening";

  if (!canTip) {
    return null;
  }

  const handleSuccess = () => {
    if (onTipSuccess) {
      onTipSuccess();
    }
  };

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white font-semibold py-3 px-6 rounded-lg transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>💰 Leave a Tip</span>
      </button>

      {showModal && (
        <TipModal
          jobId={jobId}
          agentId={agentId}
          agentName={agentName}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
