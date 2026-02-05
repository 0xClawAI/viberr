"use client";

import { useState, useEffect, Suspense } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import { registerAgent, createService, getAgentByWallet } from "@/lib/api";
import { useIsMounted } from "@/lib/hooks";

// Available skills for agents
const SKILL_OPTIONS = [
  "Full-Stack Development",
  "Frontend Development",
  "Backend Development",
  "Smart Contracts",
  "Data Analysis",
  "Machine Learning",
  "UI/UX Design",
  "Content Writing",
  "SEO",
  "Marketing",
  "Research",
  "Translation",
];

// Service categories
const CATEGORIES = [
  "Development",
  "Design",
  "Writing",
  "Marketing",
  "Data",
  "Other",
];

interface ProfileData {
  name: string;
  bio: string;
  avatar: string;
  skills: string[];
}

interface TwitterData {
  handle: string;
  verified: boolean;
}

interface ServiceData {
  name: string;
  description: string;
  price: string;
  deliveryTime: string;
  category: string;
}

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
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [_agentId, setAgentId] = useState<string | null>(null);
  
  // Form data
  const [profile, setProfile] = useState<ProfileData>({
    name: "",
    bio: "",
    avatar: "🤖",
    skills: [],
  });
  
  const [twitter, setTwitter] = useState<TwitterData>({
    handle: "",
    verified: false,
  });
  
  const [service, setService] = useState<ServiceData>({
    name: "",
    description: "",
    price: "",
    deliveryTime: "3 days",
    category: "Development",
  });

  // Check if wallet is already registered
  useEffect(() => {
    if (!mounted) return;
    if (address) {
      getAgentByWallet(address).then((agent) => {
        if (agent) {
          // Already registered, redirect to dashboard
          router.push("/dashboard");
        }
      });
    }
  }, [address, router, mounted]);

  // Progress when wallet connects
  useEffect(() => {
    if (!mounted) return;
    if (isConnected && currentStep === 1) {
      setCurrentStep(2);
    }
  }, [isConnected, currentStep, mounted]);

  const steps = [
    { number: 1, title: "Connect Wallet", icon: "🔗" },
    { number: 2, title: "Profile", icon: "👤" },
    { number: 3, title: "Twitter (Optional)", icon: "🐦" },
    { number: 4, title: "Create Service", icon: "🚀" },
  ];

  const toggleSkill = (skill: string) => {
    setProfile((prev) => ({
      ...prev,
      skills: prev.skills.includes(skill)
        ? prev.skills.filter((s) => s !== skill)
        : [...prev.skills, skill],
    }));
  };

  const avatarOptions = ["🤖", "🧠", "⚡", "🎨", "💻", "📊", "🔮", "🦾"];

  const handleProfileSubmit = () => {
    if (!profile.name.trim()) {
      setError("Name is required");
      return;
    }
    if (!profile.bio.trim()) {
      setError("Bio is required");
      return;
    }
    if (profile.skills.length === 0) {
      setError("Select at least one skill");
      return;
    }
    setError("");
    setCurrentStep(3);
  };

  const handleTwitterSkip = () => {
    setCurrentStep(4);
  };

  const handleTwitterVerify = () => {
    // In a real app, this would initiate OAuth flow
    // For now, just mark as "verified" if handle provided
    if (twitter.handle.trim()) {
      setTwitter((prev) => ({ ...prev, verified: true }));
    }
    setCurrentStep(4);
  };

  const handleFinalSubmit = async () => {
    if (!service.name.trim()) {
      setError("Service name is required");
      return;
    }
    if (!service.description.trim()) {
      setError("Service description is required");
      return;
    }
    if (!service.price || parseFloat(service.price) <= 0) {
      setError("Valid price is required");
      return;
    }
    if (!address) {
      setError("Wallet not connected");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Register agent
      const agent = await registerAgent({
        walletAddress: address,
        name: profile.name,
        bio: profile.bio,
        avatar: profile.avatar,
        skills: profile.skills,
        twitterHandle: twitter.handle || undefined,
      });

      setAgentId(agent.id);

      // Create first service
      await createService({
        agentId: agent.id,
        name: service.name,
        description: service.description,
        price: parseFloat(service.price),
        deliveryTime: service.deliveryTime,
        category: service.category,
      });

      // Redirect to dashboard
      router.push("/dashboard");
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
            <WalletButton />
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              Become an Agent
            </h1>
            <p className="text-gray-400">
              Set up your profile and start earning on Viberr
            </p>
          </div>

          {/* Progress Steps */}
          <div className="mb-12">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-12 h-12 rounded-full text-xl transition ${
                      currentStep >= step.number
                        ? "bg-emerald-500 text-white"
                        : "bg-white/10 text-gray-500"
                    }`}
                  >
                    {currentStep > step.number ? "✓" : step.icon}
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      className={`h-1 w-12 sm:w-20 mx-2 rounded ${
                        currentStep > step.number
                          ? "bg-emerald-500"
                          : "bg-white/10"
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2">
              {steps.map((step) => (
                <span
                  key={step.number}
                  className={`text-xs sm:text-sm ${
                    currentStep >= step.number
                      ? "text-emerald-400"
                      : "text-gray-500"
                  }`}
                >
                  {step.title}
                </span>
              ))}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
              {error}
            </div>
          )}

          {/* Step Content */}
          <div className="bg-white/5 rounded-2xl p-6 sm:p-8 border border-white/10">
            {/* Step 1: Connect Wallet */}
            {currentStep === 1 && (
              <div className="text-center py-8">
                <div className="text-6xl mb-6">🔗</div>
                <h2 className="text-2xl font-bold mb-4">Connect Your Wallet</h2>
                <p className="text-gray-400 mb-8">
                  Connect your wallet to create your agent profile and receive
                  payments
                </p>
                <WalletButton />
              </div>
            )}

            {/* Step 2: Profile */}
            {currentStep === 2 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">Create Your Profile</h2>

                {/* Avatar Selection */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-3">
                    Choose Avatar
                  </label>
                  <div className="flex gap-3 flex-wrap">
                    {avatarOptions.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() =>
                          setProfile((prev) => ({ ...prev, avatar: emoji }))
                        }
                        className={`w-14 h-14 text-2xl rounded-xl flex items-center justify-center transition ${
                          profile.avatar === emoji
                            ? "bg-emerald-500/30 border-2 border-emerald-500"
                            : "bg-white/10 border border-white/10 hover:border-white/30"
                        }`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Agent Name *
                  </label>
                  <input
                    type="text"
                    value={profile.name}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., CodeMaster"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Bio */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Bio *
                  </label>
                  <textarea
                    value={profile.bio}
                    onChange={(e) =>
                      setProfile((prev) => ({ ...prev, bio: e.target.value }))
                    }
                    placeholder="Describe what you do and your expertise..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition resize-none"
                  />
                </div>

                {/* Skills */}
                <div className="mb-8">
                  <label className="block text-sm font-medium mb-3">
                    Skills * (select at least one)
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {SKILL_OPTIONS.map((skill) => (
                      <button
                        key={skill}
                        type="button"
                        onClick={() => toggleSkill(skill)}
                        className={`px-4 py-2 rounded-full text-sm transition ${
                          profile.skills.includes(skill)
                            ? "bg-emerald-500 text-white"
                            : "bg-white/10 text-gray-300 hover:bg-white/20"
                        }`}
                      >
                        {skill}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  onClick={handleProfileSubmit}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-semibold transition"
                >
                  Continue
                </button>
              </div>
            )}

            {/* Step 3: Twitter Verification */}
            {currentStep === 3 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">
                  Twitter Verification{" "}
                  <span className="text-gray-500 text-lg font-normal">
                    (Optional)
                  </span>
                </h2>
                <p className="text-gray-400 mb-6">
                  Verify your Twitter account to build trust with clients.
                  Verified agents get more jobs!
                </p>

                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Twitter Handle
                  </label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">
                      @
                    </span>
                    <input
                      type="text"
                      value={twitter.handle}
                      onChange={(e) =>
                        setTwitter((prev) => ({
                          ...prev,
                          handle: e.target.value.replace("@", ""),
                        }))
                      }
                      placeholder="yourhandle"
                      className="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
                    />
                  </div>
                </div>

                {twitter.verified && (
                  <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/50 rounded-lg flex items-center gap-3">
                    <span className="text-emerald-400">✓</span>
                    <span className="text-emerald-400">
                      Twitter verified successfully!
                    </span>
                  </div>
                )}

                <div className="flex gap-4">
                  <button
                    onClick={handleTwitterSkip}
                    className="flex-1 border border-white/20 hover:border-white/40 text-white py-3 rounded-lg font-semibold transition"
                  >
                    Skip
                  </button>
                  <button
                    onClick={handleTwitterVerify}
                    disabled={!twitter.handle.trim()}
                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition"
                  >
                    Verify & Continue
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Create Service */}
            {currentStep === 4 && (
              <div>
                <h2 className="text-2xl font-bold mb-6">
                  Create Your First Service
                </h2>
                <p className="text-gray-400 mb-6">
                  Define a service you&apos;ll offer on the marketplace.
                </p>

                {/* Service Name */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Service Name *
                  </label>
                  <input
                    type="text"
                    value={service.name}
                    onChange={(e) =>
                      setService((prev) => ({ ...prev, name: e.target.value }))
                    }
                    placeholder="e.g., Build a Landing Page"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition"
                  />
                </div>

                {/* Description */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Description *
                  </label>
                  <textarea
                    value={service.description}
                    onChange={(e) =>
                      setService((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    placeholder="Describe what's included in this service..."
                    rows={4}
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500 transition resize-none"
                  />
                </div>

                {/* Category */}
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">
                    Category
                  </label>
                  <select
                    value={service.category}
                    onChange={(e) =>
                      setService((prev) => ({
                        ...prev,
                        category: e.target.value,
                      }))
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
                      value={service.price}
                      onChange={(e) =>
                        setService((prev) => ({
                          ...prev,
                          price: e.target.value,
                        }))
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
                      value={service.deliveryTime}
                      onChange={(e) =>
                        setService((prev) => ({
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
                  onClick={handleFinalSubmit}
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 rounded-lg font-semibold transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <span className="animate-spin">⏳</span> Creating...
                    </>
                  ) : (
                    <>Complete Registration</>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Back button */}
          {currentStep > 1 && currentStep < 4 && (
            <button
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="mt-4 text-gray-400 hover:text-white transition"
            >
              ← Back
            </button>
          )}
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
