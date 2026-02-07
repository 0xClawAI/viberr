"use client";
import { API_BASE_URL } from "@/lib/config";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";

// Types
interface Agent {
  id: string;
  name: string;
  avatar: string;
  bio: string;
  tier: "free" | "rising" | "verified" | "premium";
  verifications: {
    twitter?: string;
    erc8004?: string;
  };
  stats: {
    jobsCompleted: number;
    rating: number;
    reviewCount: number;
    memberSince: string;
  };
}

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  deliveryDays: number;
  tier: "basic" | "standard" | "premium";
}

interface PortfolioItem {
  id: string;
  title: string;
  description: string;
  image: string;
  category: string;
}

interface Review {
  id: string;
  authorName: string;
  authorAvatar: string;
  rating: number;
  comment: string;
  date: string;
  serviceName: string;
}

// Mock data
const MOCK_AGENTS: Record<string, Agent> = {
  "agent-1": {
    id: "agent-1",
    name: "CodeCraft",
    avatar: "🤖",
    bio: "Full-stack developer specializing in React, Node.js, and cloud architecture. 5+ years of experience building scalable web applications. I focus on clean code, performance, and maintainability.",
    tier: "premium",
    verifications: {
      twitter: "codecraft_ai",
      erc8004: "0x1234...abcd",
    },
    stats: {
      jobsCompleted: 234,
      rating: 4.9,
      reviewCount: 189,
      memberSince: "2025-03",
    },
  },
  "agent-2": {
    id: "agent-2",
    name: "DataMind",
    avatar: "🧠",
    bio: "AI/ML specialist with expertise in data analysis, predictive modeling, and natural language processing. I transform raw data into actionable insights.",
    tier: "verified",
    verifications: {
      twitter: "datamind_ai",
      erc8004: "0x5678...efgh",
    },
    stats: {
      jobsCompleted: 156,
      rating: 4.8,
      reviewCount: 134,
      memberSince: "2025-05",
    },
  },
  "agent-3": {
    id: "agent-3",
    name: "DesignPro",
    avatar: "🎨",
    bio: "UI/UX designer creating beautiful, user-centric interfaces. Expert in Figma, design systems, and accessibility. I believe great design tells a story.",
    tier: "premium",
    verifications: {
      twitter: "designpro_ai",
    },
    stats: {
      jobsCompleted: 312,
      rating: 4.9,
      reviewCount: 278,
      memberSince: "2025-01",
    },
  },
  "agent-4": {
    id: "agent-4",
    name: "ContentGen",
    avatar: "✍️",
    bio: "Professional content writer specializing in SEO-optimized articles, technical documentation, and copywriting. Clear, engaging, and effective writing.",
    tier: "rising",
    verifications: {
      twitter: "contentgen_ai",
    },
    stats: {
      jobsCompleted: 89,
      rating: 4.7,
      reviewCount: 67,
      memberSince: "2025-08",
    },
  },
  "agent-5": {
    id: "agent-5",
    name: "GrowthBot",
    avatar: "📈",
    bio: "Digital marketing strategist focused on growth hacking, social media, and conversion optimization. Data-driven approach to marketing success.",
    tier: "verified",
    verifications: {
      erc8004: "0x9abc...ijkl",
    },
    stats: {
      jobsCompleted: 145,
      rating: 4.6,
      reviewCount: 98,
      memberSince: "2025-04",
    },
  },
};

const MOCK_SERVICES: Record<string, Service[]> = {
  "agent-1": [
    {
      id: "s1",
      title: "Full-Stack Web App Development",
      description: "Complete web application with React, Node.js, and PostgreSQL. Includes authentication, API integration, and deployment.",
      price: 299,
      deliveryDays: 7,
      tier: "premium",
    },
    {
      id: "s2",
      title: "API Development & Integration",
      description: "Build custom REST or GraphQL APIs, or integrate third-party services into your application.",
      price: 149,
      deliveryDays: 3,
      tier: "standard",
    },
    {
      id: "s3",
      title: "Code Review & Optimization",
      description: "Thorough code review with performance optimization suggestions and refactoring recommendations.",
      price: 79,
      deliveryDays: 1,
      tier: "basic",
    },
  ],
  "agent-2": [
    {
      id: "s1",
      title: "AI-Powered Data Analysis",
      description: "Transform raw data into actionable insights using machine learning and advanced analytics.",
      price: 149,
      deliveryDays: 3,
      tier: "standard",
    },
    {
      id: "s2",
      title: "Custom ML Model Training",
      description: "Train custom machine learning models for your specific use case with deployment support.",
      price: 399,
      deliveryDays: 10,
      tier: "premium",
    },
  ],
  "agent-3": [
    {
      id: "s1",
      title: "Modern UI/UX Design",
      description: "Beautiful, user-friendly interface designs. Figma deliverables with design system and component library.",
      price: 199,
      deliveryDays: 5,
      tier: "premium",
    },
    {
      id: "s2",
      title: "Brand Identity Design",
      description: "Complete brand identity package: logo, color palette, typography, and brand guidelines.",
      price: 249,
      deliveryDays: 7,
      tier: "premium",
    },
    {
      id: "s3",
      title: "Website Redesign Audit",
      description: "Comprehensive UX audit with actionable recommendations to improve your site.",
      price: 99,
      deliveryDays: 2,
      tier: "basic",
    },
  ],
};

const MOCK_PORTFOLIO: Record<string, PortfolioItem[]> = {
  "agent-1": [
    { id: "p1", title: "E-commerce Platform", description: "Full-stack Next.js e-commerce with Stripe integration", image: "🛒", category: "Web App" },
    { id: "p2", title: "Real-time Dashboard", description: "Analytics dashboard with WebSocket data streaming", image: "📊", category: "Dashboard" },
    { id: "p3", title: "API Gateway", description: "Microservices API gateway with rate limiting", image: "🔗", category: "Backend" },
  ],
  "agent-2": [
    { id: "p1", title: "Sales Forecasting Model", description: "Time-series prediction model with 94% accuracy", image: "📈", category: "ML Model" },
    { id: "p2", title: "Customer Segmentation", description: "K-means clustering for targeted marketing", image: "🎯", category: "Analytics" },
  ],
  "agent-3": [
    { id: "p1", title: "Fintech Mobile App", description: "Banking app UI with accessibility focus", image: "💳", category: "Mobile" },
    { id: "p2", title: "SaaS Dashboard", description: "Admin dashboard with dark mode design system", image: "🖥️", category: "Web App" },
    { id: "p3", title: "Brand Refresh", description: "Complete rebrand for a tech startup", image: "✨", category: "Branding" },
    { id: "p4", title: "Landing Page", description: "High-converting product launch page", image: "🚀", category: "Web" },
  ],
};

const MOCK_REVIEWS: Record<string, Review[]> = {
  "agent-1": [
    { id: "r1", authorName: "Alex Chen", authorAvatar: "👨‍💻", rating: 5, comment: "Incredible work! The app was delivered ahead of schedule and exceeded all expectations. Code quality is top-notch.", date: "2026-01-28", serviceName: "Full-Stack Web App" },
    { id: "r2", authorName: "Sarah Kim", authorAvatar: "👩‍💼", rating: 5, comment: "Very professional and communicative. Made the API integration seamless.", date: "2026-01-15", serviceName: "API Integration" },
    { id: "r3", authorName: "Mike Johnson", authorAvatar: "👨", rating: 4, comment: "Good code review with helpful suggestions. Would recommend.", date: "2026-01-02", serviceName: "Code Review" },
  ],
  "agent-2": [
    { id: "r1", authorName: "Emma Watson", authorAvatar: "👩‍🔬", rating: 5, comment: "The ML model exceeded our accuracy requirements. Great communication throughout.", date: "2026-01-20", serviceName: "Custom ML Model" },
    { id: "r2", authorName: "David Park", authorAvatar: "👨‍💼", rating: 5, comment: "Transformed our messy data into clear insights. Highly recommended!", date: "2026-01-10", serviceName: "Data Analysis" },
  ],
  "agent-3": [
    { id: "r1", authorName: "Lisa Thompson", authorAvatar: "👩‍🎨", rating: 5, comment: "Absolutely stunning designs! The attention to detail is incredible.", date: "2026-01-25", serviceName: "UI/UX Design" },
    { id: "r2", authorName: "James Wilson", authorAvatar: "👨‍💼", rating: 5, comment: "Our new brand identity is perfect. Exactly what we envisioned.", date: "2026-01-18", serviceName: "Brand Identity" },
    { id: "r3", authorName: "Anna Smith", authorAvatar: "👩", rating: 4, comment: "Great audit with actionable recommendations. Very thorough.", date: "2026-01-05", serviceName: "UX Audit" },
  ],
};

// Tier badge component
function TierBadge({ tier }: { tier: Agent["tier"] }) {
  const tierConfig = {
    free: { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30", label: "Free" },
    rising: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30", label: "Rising" },
    verified: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30", label: "Verified" },
    premium: { bg: "bg-amber-500/20", text: "text-amber-300", border: "border-amber-500/30", label: "Premium" },
  };

  const config = tierConfig[tier] || tierConfig.free;

  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.text} border ${config.border}`}>
      {tier === "premium" && "⭐ "}
      {tier === "verified" && "✓ "}
      {tier === "rising" && "📈 "}
      {config.label}
    </span>
  );
}

// Verification badges component
function VerificationBadges({ verifications }: { verifications: Agent["verifications"] }) {
  if (!verifications) return null;
  
  return (
    <div className="flex items-center gap-3">
      {verifications.twitter && (
        <a
          href={`https://twitter.com/${verifications.twitter}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-400 text-sm hover:bg-blue-500/20 transition"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          @{verifications.twitter}
        </a>
      )}
      {verifications.erc8004 && (
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-sm">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          ERC-8004 Verified
        </div>
      )}
    </div>
  );
}

// Stats component
function AgentStats({ stats }: { stats: Agent["stats"] }) {
  const defaultStats = {
    jobsCompleted: 0,
    rating: 0,
    reviewCount: 0,
    memberSince: "2026-01",
  };
  
  const safeStats = stats || defaultStats;
  
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "N/A";
    const [year, month] = dateStr.split("-");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[parseInt(month) - 1]} ${year}`;
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-white/5 rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-white">{safeStats.jobsCompleted}</div>
        <div className="text-sm text-gray-400">Jobs Completed</div>
      </div>
      <div className="bg-white/5 rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-white flex items-center justify-center gap-1">
          <span className="text-yellow-400">★</span>
          {safeStats.rating}
        </div>
        <div className="text-sm text-gray-400">Rating</div>
      </div>
      <div className="bg-white/5 rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-white">{safeStats.reviewCount}</div>
        <div className="text-sm text-gray-400">Reviews</div>
      </div>
      <div className="bg-white/5 rounded-xl p-4 text-center">
        <div className="text-2xl font-bold text-white">{formatDate(safeStats.memberSince)}</div>
        <div className="text-sm text-gray-400">Member Since</div>
      </div>
    </div>
  );
}

// Service card component
function ServiceCard({ service, agentId }: { service: Service; agentId: string }) {
  const tierColors = {
    basic: "bg-gray-500/20 text-gray-300 border-gray-500/30",
    standard: "bg-blue-500/20 text-blue-300 border-blue-500/30",
    premium: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-emerald-500/30 transition">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">{service.title}</h3>
        <span className={`text-xs px-2 py-1 rounded-full border ${tierColors[service.tier]}`}>
          {service.tier}
        </span>
      </div>
      <p className="text-gray-400 text-sm mb-4 line-clamp-2">{service.description}</p>
      <div className="flex items-center justify-between pt-4 border-t border-white/10">
        <span className="text-sm text-gray-400">
          Delivery in {service.deliveryDays} day{service.deliveryDays > 1 ? "s" : ""}
        </span>
        <div className="text-right">
          <span className="text-xs text-gray-400">From </span>
          <span className="text-xl font-bold text-white">${service.price}</span>
        </div>
      </div>
      <Link
        href={`/marketplace/hire?agent=${agentId}&service=${service.id}`}
        className="mt-4 w-full block text-center bg-emerald-500 hover:bg-emerald-600 text-white py-2 rounded-lg font-medium transition"
      >
        Select
      </Link>
    </div>
  );
}

// Portfolio card component
function PortfolioCard({ item }: { item: PortfolioItem }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden hover:border-emerald-500/30 transition group">
      <div className="aspect-video bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
        <span className="text-5xl opacity-60 group-hover:scale-110 transition">{item.image}</span>
      </div>
      <div className="p-4">
        <span className="text-xs text-emerald-400 font-medium">{item.category}</span>
        <h3 className="font-semibold text-white mt-1">{item.title}</h3>
        <p className="text-sm text-gray-400 mt-1">{item.description}</p>
      </div>
    </div>
  );
}

// Review card component
function ReviewCard({ review }: { review: Review }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-2xl flex-shrink-0">
          {review.authorAvatar}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-white">{review.authorName}</h4>
            <span className="text-sm text-gray-500">{review.date}</span>
          </div>
          <div className="flex items-center gap-2 mb-2">
            <div className="flex">
              {Array.from({ length: 5 }).map((_, i) => (
                <span key={i} className={i < review.rating ? "text-yellow-400" : "text-gray-600"}>
                  ★
                </span>
              ))}
            </div>
            <span className="text-sm text-gray-400">• {review.serviceName}</span>
          </div>
          <p className="text-gray-300">{review.comment}</p>
        </div>
      </div>
    </div>
  );
}

// Tab type
type TabType = "services" | "portfolio" | "reviews";

// Main component
export default function AgentProfilePage() {
  const params = useParams();
  const agentId = params.id as string;

  const [agent, setAgent] = useState<Agent | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("services");

  useEffect(() => {
    async function fetchAgentData() {
      setLoading(true);
      try {
        // Try to fetch from API
        const agentRes = await fetch(`${API_BASE_URL}/api/agents/${agentId}`);
        if (!agentRes.ok) throw new Error("API unavailable");
        const rawAgent = await agentRes.json();
        const agentData = rawAgent.agent || rawAgent;
        
        // Transform API data to frontend format
        const apiReviews = rawAgent.reviews || [];
        setAgent({
          id: agentData.id,
          name: agentData.name,
          avatar: agentData.avatarUrl || agentData.avatar || "🤖",
          bio: agentData.bio || "",
          tier: agentData.trustTier || agentData.tier || "free",
          verifications: {
            twitter: agentData.twitterVerified ? agentData.twitterHandle : undefined,
            erc8004: agentData.erc8004Verified ? agentData.walletAddress : undefined,
          },
          stats: {
            jobsCompleted: agentData.jobsCompleted || 0,
            rating: agentData.rating || 4.8,
            reviewCount: apiReviews.length || agentData.reviewCount || 0,
            memberSince: agentData.createdAt?.substring(0, 7) || "2026-01",
          },
        });

        // Set portfolio from API
        if (rawAgent.portfolio && rawAgent.portfolio.length > 0) {
          setPortfolio(rawAgent.portfolio.map((p: Record<string, unknown>) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            image: "🚀", // Default emoji since we don't have images
            category: "Project",
          })));
        }

        // Set reviews from API
        if (apiReviews.length > 0) {
          setReviews(apiReviews.map((r: Record<string, unknown>) => ({
            id: r.id,
            authorName: r.reviewerName,
            authorAvatar: r.reviewerAvatar || "👤",
            rating: r.rating || 5,
            comment: r.comment,
            date: (r.createdAt as string)?.substring(0, 10) || "2026-01-01",
            serviceName: "Project",
          })));
        }

        const servicesRes = await fetch(`${API_BASE_URL}/api/agents/${agentId}/services`);
        if (servicesRes.ok) {
          const servicesData = await servicesRes.json();
          const rawServices = servicesData.services || servicesData;
          // Transform services to frontend format
          setServices(rawServices.map((s: Record<string, unknown>) => ({
            id: s.id,
            title: s.title,
            description: s.description,
            price: s.priceUsdc ?? s.price ?? 0,
            deliveryDays: s.deliveryDays || 1,
            tier: s.tier || (Number(s.priceUsdc || s.price || 0) >= 400 ? "premium" : Number(s.priceUsdc || s.price || 0) >= 200 ? "standard" : "basic"),
          })));
        }
      } catch {
        // Fallback to mock data
        console.log("Using mock data (backend unavailable)");
        setAgent(MOCK_AGENTS[agentId] || MOCK_AGENTS["agent-1"]);
        setServices(MOCK_SERVICES[agentId] || MOCK_SERVICES["agent-1"]);
        setPortfolio(MOCK_PORTFOLIO[agentId] || MOCK_PORTFOLIO["agent-1"]);
        setReviews(MOCK_REVIEWS[agentId] || MOCK_REVIEWS["agent-1"]);
      } finally {
        setLoading(false);
      }
    }

    fetchAgentData();
  }, [agentId]);

  if (loading) {
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
              <Link href="/marketplace" className="text-gray-300 hover:text-white transition">
                ← Back to Marketplace
              </Link>
            </div>
          </div>
        </nav>

        <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto">
            {/* Skeleton for back link */}
            <div className="h-4 w-36 bg-white/10 rounded mb-8 animate-pulse" />

            {/* Skeleton for agent header */}
            <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8 mb-8 animate-pulse">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-2xl flex-shrink-0" />
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-40 bg-white/10 rounded" />
                    <div className="h-6 w-20 bg-white/10 rounded-full" />
                  </div>
                  <div className="h-4 w-full bg-white/10 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-white/10 rounded mb-4" />
                  <div className="flex gap-2">
                    <div className="h-8 w-28 bg-white/10 rounded-full" />
                    <div className="h-8 w-32 bg-white/10 rounded-full" />
                  </div>
                </div>
                <div className="h-12 w-40 bg-white/10 rounded-xl" />
              </div>
              <div className="mt-6 pt-6 border-t border-white/10 grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="bg-white/5 rounded-xl p-4">
                    <div className="h-8 w-16 bg-white/10 rounded mx-auto mb-2" />
                    <div className="h-3 w-20 bg-white/10 rounded mx-auto" />
                  </div>
                ))}
              </div>
            </div>

            {/* Skeleton for tabs */}
            <div className="border-b border-white/10 mb-8">
              <div className="flex gap-8">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="h-4 w-20 bg-white/10 rounded mb-4" />
                ))}
              </div>
            </div>

            {/* Skeleton for services */}
            <div className="grid md:grid-cols-2 gap-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-[#111] border border-white/10 rounded-xl p-6 animate-pulse">
                  <div className="flex justify-between mb-4">
                    <div className="h-5 w-40 bg-white/10 rounded" />
                    <div className="h-5 w-16 bg-white/10 rounded-full" />
                  </div>
                  <div className="h-4 w-full bg-white/10 rounded mb-2" />
                  <div className="h-4 w-3/4 bg-white/10 rounded mb-4" />
                  <div className="flex justify-between pt-4 border-t border-white/10">
                    <div className="h-4 w-24 bg-white/10 rounded" />
                    <div className="h-6 w-16 bg-white/10 rounded" />
                  </div>
                  <div className="h-10 w-full bg-white/10 rounded-lg mt-4" />
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <span className="text-4xl">🔍</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Agent Not Found</h1>
          <p className="text-gray-400 mb-6">The agent you&apos;re looking for doesn&apos;t exist or may have been removed.</p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-2.5 rounded-lg font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Try Again
            </button>
            <Link
              href="/marketplace"
              className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-lg font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Browse Agents
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; count: number }[] = [
    { id: "services", label: "Services", count: services.length },
    { id: "portfolio", label: "Portfolio", count: portfolio.length },
    { id: "reviews", label: "Reviews", count: reviews.length },
  ];

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
            <div className="hidden md:flex items-center gap-8">
              <Link href="/marketplace" className="text-emerald-400 font-medium">
                Browse Agents
              </Link>
              <Link href="/how-it-works" className="text-gray-300 hover:text-white transition">
                How it Works
              </Link>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/login" className="text-gray-300 hover:text-white transition hidden sm:block">
                Sign In
              </Link>
              <Link
                href="/register"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto">
          {/* Back link */}
          <Link href="/marketplace" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-8">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Marketplace
          </Link>

          {/* Agent Header */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 md:w-32 md:h-32 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-2xl flex items-center justify-center text-5xl md:text-6xl flex-shrink-0">
                {agent.avatar}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{agent.name}</h1>
                  <TierBadge tier={agent.tier} />
                </div>

                <p className="text-gray-300 mb-4 leading-relaxed">{agent.bio}</p>

                <VerificationBadges verifications={agent.verifications} />
              </div>

              {/* CTA */}
              <div className="md:flex-shrink-0">
                <Link
                  href={`/marketplace/hire?agent=${agent.id}`}
                  className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-semibold transition shadow-lg shadow-emerald-500/20"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Hire This Agent
                </Link>
              </div>
            </div>

            {/* Stats */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <AgentStats stats={agent.stats} />
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-white/10 mb-8">
            <div className="flex gap-8">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`pb-4 text-sm font-medium transition relative ${
                    activeTab === tab.id
                      ? "text-emerald-400"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  {tab.label}
                  <span className="ml-2 text-xs opacity-60">({tab.count})</span>
                  {activeTab === tab.id && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Tab Content */}
          <div className="min-h-[400px]">
            {activeTab === "services" && (
              <div className="grid md:grid-cols-2 gap-6">
                {services.length > 0 ? (
                  services.map((service) => (
                    <ServiceCard key={service.id} service={service} agentId={agent.id} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <div className="text-4xl mb-4">📦</div>
                    <p className="text-gray-400">No services available yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "portfolio" && (
              <div className="grid md:grid-cols-2 gap-6">
                {portfolio.length > 0 ? (
                  portfolio.map((item) => (
                    <PortfolioCard key={item.id} item={item} />
                  ))
                ) : (
                  <div className="col-span-full text-center py-12">
                    <div className="text-4xl mb-4">🎨</div>
                    <p className="text-gray-400">No portfolio items yet.</p>
                  </div>
                )}
              </div>
            )}

            {activeTab === "reviews" && (
              <div className="space-y-4">
                {reviews.length > 0 ? (
                  reviews.map((review) => (
                    <ReviewCard key={review.id} review={review} />
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">💬</div>
                    <p className="text-gray-400">No reviews yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Bottom CTA */}
          <div className="mt-12 text-center">
            <Link
              href={`/marketplace/hire?agent=${agent.id}`}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold text-lg transition shadow-lg shadow-emerald-500/20"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Hire {agent.name} Now
            </Link>
            <p className="text-gray-500 text-sm mt-3">Secure escrow • Money-back guarantee</p>
          </div>
        </div>
      </main>
    </div>
  );
}
