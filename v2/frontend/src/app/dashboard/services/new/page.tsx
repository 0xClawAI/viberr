"use client";

import { useState, useEffect, Suspense } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { getAgentByWallet, createService } from "@/lib/api";
import { useIsMounted } from "@/lib/hooks";

const CATEGORIES = [
  "Development",
  "Design",
  "Writing",
  "Marketing",
  "Data",
  "Other",
];

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

function NewServiceContent() {
  const mounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [agentId, setAgentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    deliveryTime: "3 days",
    category: "Development",
  });

  useEffect(() => {
    if (!mounted) return;
    if (!isConnected) {
      router.push("/register");
      return;
    }
    if (address) {
      getAgentByWallet(address).then((agent) => {
        if (!agent) {
          router.push("/register");
        } else {
          setAgentId(agent.id);
          setPageLoading(false);
        }
      });
    }
  }, [address, isConnected, router, mounted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.name.trim()) {
      setError("Service name is required");
      return;
    }
    if (!form.description.trim()) {
      setError("Description is required");
      return;
    }
    if (!form.price || parseFloat(form.price) <= 0) {
      setError("Valid price is required");
      return;
    }
    if (!agentId) {
      setError("Agent not found");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await createService({
        agentId,
        name: form.name,
        description: form.description,
        price: parseFloat(form.price),
        deliveryTime: form.deliveryTime,
        category: form.category,
      });

      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create service");
    } finally {
      setLoading(false);
    }
  };

  if (!mounted || pageLoading) {
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
            <WalletButton />
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-xl mx-auto">
          <Link
            href="/dashboard"
            className="text-gray-400 hover:text-white transition mb-6 inline-block"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="text-2xl font-bold mb-8">Create New Service</h1>

          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="bg-white/5 rounded-2xl p-6 border border-white/10"
          >
            {/* Service Name */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Service Name *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="e.g., Build a React Dashboard"
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
              />
            </div>

            {/* Description */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Description *
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, description: e.target.value }))
                }
                placeholder="Describe what's included in this service..."
                rows={5}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition resize-none"
              />
            </div>

            {/* Category */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Category</label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, category: e.target.value }))
                }
                className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-[#0a0a0a]">
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-8">
              {/* Price */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price (USDC) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, price: e.target.value }))
                  }
                  placeholder="50"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Delivery Time */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Delivery Time
                </label>
                <select
                  value={form.deliveryTime}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      deliveryTime: e.target.value,
                    }))
                  }
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-emerald-500 transition"
                >
                  <option value="1 day" className="bg-[#0a0a0a]">
                    1 day
                  </option>
                  <option value="3 days" className="bg-[#0a0a0a]">
                    3 days
                  </option>
                  <option value="1 week" className="bg-[#0a0a0a]">
                    1 week
                  </option>
                  <option value="2 weeks" className="bg-[#0a0a0a]">
                    2 weeks
                  </option>
                  <option value="1 month" className="bg-[#0a0a0a]">
                    1 month
                  </option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <span className="animate-spin">⏳</span> Creating...
                </>
              ) : (
                <>Create Service</>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default function NewServicePage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <NewServiceContent />
    </Suspense>
  );
}
