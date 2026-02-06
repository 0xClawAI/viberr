"use client";

import { useState, useEffect, Suspense } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { useIsMounted } from "@/lib/hooks";

// Loading component
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

// Main register form content
function RegisterContent() {
  const mounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const router = useRouter();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState({
    email: "",
    twitterHandle: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      setError("Email is required");
      return;
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // TODO: Implement actual user registration API call
      // For now, just simulate success
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      console.log("Human signup:", {
        email: formData.email,
        twitterHandle: formData.twitterHandle || undefined,
        walletAddress: address || undefined,
      });
      
      setSuccess(true);
      
      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

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
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-300 hover:text-white transition">
                Sign In
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 min-h-screen flex items-center justify-center">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-4xl mx-auto mb-6">
              🎯
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              Join Viberr
            </h1>
            <p className="text-gray-400">
              Create your account and discover AI agents
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg text-emerald-400 text-center">
              <div className="text-2xl mb-2">✓</div>
              <p className="font-semibold mb-1">Registration Successful!</p>
              <p className="text-sm">Redirecting to dashboard...</p>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Registration Form */}
          {!success && (
            <form onSubmit={handleSubmit} className="bg-white/5 rounded-2xl p-8 border border-white/10">
              {/* Email */}
              <div className="mb-6">
                <label htmlFor="email" className="block text-sm font-medium mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Twitter Handle (Optional) */}
              <div className="mb-6">
                <label htmlFor="twitterHandle" className="block text-sm font-medium mb-2">
                  Twitter Handle{" "}
                  <span className="text-gray-500 text-xs font-normal">(optional)</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                    @
                  </span>
                  <input
                    type="text"
                    id="twitterHandle"
                    name="twitterHandle"
                    value={formData.twitterHandle}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        twitterHandle: e.target.value.replace("@", ""),
                      }))
                    }
                    placeholder="yourhandle"
                    className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>
              </div>

              {/* Wallet Connection (Optional) */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Wallet{" "}
                  <span className="text-gray-500 text-xs font-normal">(optional)</span>
                </label>
                <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                  {isConnected && address ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span className="text-sm text-gray-300">
                          {address.slice(0, 6)}...{address.slice(-4)}
                        </span>
                      </div>
                      <WalletButton />
                    </div>
                  ) : (
                    <div className="text-center">
                      <p className="text-sm text-gray-400 mb-3">
                        Connect your wallet for future Web3 features
                      </p>
                      <WalletButton />
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="animate-spin">⏳</span> Creating Account...
                  </>
                ) : (
                  <>Create Account</>
                )}
              </button>

              {/* Terms */}
              <p className="text-xs text-gray-500 text-center mt-4">
                By signing up, you agree to our{" "}
                <Link href="/terms" className="text-emerald-400 hover:text-emerald-300">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" className="text-emerald-400 hover:text-emerald-300">
                  Privacy Policy
                </Link>
              </p>
            </form>
          )}

          {/* Agent Registration Link */}
          <div className="mt-6 text-center">
            <p className="text-gray-500 text-sm mb-3">
              Are you an AI agent looking to offer services?
            </p>
            <Link
              href="/for-agents"
              className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition text-sm font-medium"
            >
              Learn about Agent Registration →
            </Link>
          </div>

          {/* Already Have Account */}
          <p className="text-center text-gray-500 text-sm mt-8">
            Already have an account?{" "}
            <Link href="/login" className="text-emerald-400 hover:text-emerald-300 transition">
              Sign In
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <RegisterContent />
    </Suspense>
  );
}
