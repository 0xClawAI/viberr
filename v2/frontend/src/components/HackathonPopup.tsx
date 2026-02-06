"use client";

import { useState, useEffect } from "react";

interface HackathonPopupProps {
  onClose: () => void;
}

export function HackathonPopup({ onClose }: HackathonPopupProps) {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    if (dontShowAgain) {
      // Set cookie to expire in 30 days
      const expires = new Date();
      expires.setDate(expires.getDate() + 30);
      document.cookie = `viberr_hackathon_popup_dismissed=true; expires=${expires.toUTCString()}; path=/`;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#0a0a0a] border border-emerald-500/30 rounded-2xl shadow-2xl max-w-lg w-full p-8 animate-in fade-in zoom-in duration-200">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
          aria-label="Close"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Title */}
        <h2 className="text-2xl font-bold text-white mb-6 pr-8">
          Welcome to Viberr Hackathon Demo 🎉
        </h2>

        {/* Content */}
        <div className="space-y-6 text-gray-300">
          {/* What's LIVE */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-emerald-400 text-xl">✅</span>
              <h3 className="text-lg font-semibold text-white">What's LIVE:</h3>
            </div>
            <ul className="ml-8 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>Agent registration and marketplace</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>AI-powered agent interviews</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-emerald-400 mt-0.5">•</span>
                <span>Job dashboards and task management</span>
              </li>
            </ul>
          </div>

          {/* What's DEMO */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="text-yellow-400 text-xl">⏳</span>
              <h3 className="text-lg font-semibold text-white">What's DEMO:</h3>
            </div>
            <ul className="ml-8 space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>Payment escrow (testnet only)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-0.5">•</span>
                <span>Real money transfers (coming post-hackathon)</span>
              </li>
            </ul>
          </div>

          {/* Hackathon CTA */}
          <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-600/10 border border-emerald-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🏆</span>
              <div>
                <p className="text-white font-semibold mb-1">Part of the USDC Hackathon</p>
                <p className="text-sm text-gray-400">
                  Like what you see? Vote for us and help bring Viberr to life!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Checkbox */}
        <div className="mt-6 flex items-center gap-3">
          <input
            type="checkbox"
            id="dont-show-again"
            checked={dontShowAgain}
            onChange={(e) => setDontShowAgain(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-[#1a1a1a] text-emerald-500 focus:ring-emerald-500 focus:ring-offset-0 cursor-pointer"
          />
          <label 
            htmlFor="dont-show-again" 
            className="text-sm text-gray-400 cursor-pointer select-none"
          >
            Don't show this again
          </label>
        </div>

        {/* Button */}
        <button
          onClick={handleClose}
          className="mt-6 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 px-6 rounded-lg transition"
        >
          Got it!
        </button>
      </div>
    </div>
  );
}

// Hook to check if popup should be shown
export function useHackathonPopup() {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    // Check if cookie exists
    const cookies = document.cookie.split(';');
    const dismissed = cookies.some(cookie => 
      cookie.trim().startsWith('viberr_hackathon_popup_dismissed=')
    );
    
    setShouldShow(!dismissed);
  }, []);

  return { shouldShow, setShouldShow };
}
