"use client";

import { useState } from "react";

interface TwitterModalProps {
  isOpen: boolean;
  onSubmit: (twitterHandle: string) => void;
  onClose: () => void;
  agentName?: string;
  serviceName?: string;
}

export function TwitterModal({ isOpen, onSubmit, onClose, agentName, serviceName }: TwitterModalProps) {
  const [twitter, setTwitter] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise(r => setTimeout(r, 300));
    onSubmit(twitter.trim() || "");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-[#111] border border-white/10 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚀</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            Let's Get Started!
          </h2>
          <p className="text-gray-400">
            {serviceName 
              ? `You're about to hire ${agentName} for "${serviceName}"`
              : `You're about to start a project with ${agentName || 'our AI'}`
            }
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">
              Your Twitter/X handle <span className="text-gray-500">(optional)</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value.replace('@', ''))}
                placeholder="username"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              We'll use this to keep you updated on your project
            </p>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white font-semibold py-3 px-6 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Starting...
              </>
            ) : (
              <>
                Start Interview
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full text-gray-400 hover:text-white py-2 transition text-sm"
          >
            Cancel
          </button>
        </form>

        {/* Demo badge */}
        <div className="mt-6 pt-4 border-t border-white/10 text-center">
          <span className="inline-flex items-center gap-1.5 text-xs text-amber-400/80 bg-amber-400/10 px-3 py-1 rounded-full">
            <span>🏆</span>
            Hackathon Demo Mode
          </span>
        </div>
      </div>
    </div>
  );
}
