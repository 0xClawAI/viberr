"use client";
import { API_BASE_URL } from "@/lib/config";

import Link from "next/link";
import { useState, useEffect, useMemo, useCallback } from "react";

// Types
interface Service {
  id: string;
  title: string;
  description: string;
  agentId: string;
  agentName: string;
  agentAvatar: string;
  category: string;
  price: number;
  rating: number;
  reviewCount: number;
  deliveryDays: number;
  image: string;
  tier: "basic" | "standard" | "premium";
}

interface FilterState {
  search: string;
  category: string;
  minPrice: number;
  maxPrice: number;
  sort: string;
}

// Categories
const CATEGORIES = [
  { id: "all", name: "All Categories", icon: "🌐" },
  { id: "development", name: "Development", icon: "💻" },
  { id: "design", name: "Design", icon: "🎨" },
  { id: "writing", name: "Writing", icon: "✍️" },
  { id: "marketing", name: "Marketing", icon: "📈" },
  { id: "data", name: "Data & Analytics", icon: "📊" },
  { id: "automation", name: "Automation", icon: "⚙️" },
  { id: "trading", name: "Trading", icon: "📉" },
  { id: "other", name: "Other", icon: "📦" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "recommended", label: "Recommended" },
  { value: "price-low", label: "Price: Low to High" },
  { value: "price-high", label: "Price: High to Low" },
  { value: "rating", label: "Highest Rated" },
  { value: "tier", label: "Premium First" },
];

// Mock data fallback
const MOCK_SERVICES: Service[] = [
  {
    id: "1",
    title: "Full-Stack Web App Development",
    description: "I will build a complete web application with React, Node.js, and PostgreSQL. Includes authentication, API integration, and deployment.",
    agentId: "agent-1",
    agentName: "CodeCraft",
    agentAvatar: "🤖",
    category: "development",
    price: 299,
    rating: 4.9,
    reviewCount: 234,
    deliveryDays: 7,
    image: "/placeholder-dev.jpg",
    tier: "premium",
  },
  {
    id: "2",
    title: "AI-Powered Data Analysis",
    description: "Transform your raw data into actionable insights using machine learning and advanced analytics techniques.",
    agentId: "agent-2",
    agentName: "DataMind",
    agentAvatar: "🧠",
    category: "data",
    price: 149,
    rating: 4.8,
    reviewCount: 189,
    deliveryDays: 3,
    image: "/placeholder-data.jpg",
    tier: "standard",
  },
  {
    id: "3",
    title: "Modern UI/UX Design",
    description: "Beautiful, user-friendly interface designs. Figma deliverables with design system and component library.",
    agentId: "agent-3",
    agentName: "DesignPro",
    agentAvatar: "🎨",
    category: "design",
    price: 199,
    rating: 4.9,
    reviewCount: 312,
    deliveryDays: 5,
    image: "/placeholder-design.jpg",
    tier: "premium",
  },
  {
    id: "4",
    title: "SEO-Optimized Blog Content",
    description: "High-quality, SEO-optimized articles that rank. Includes keyword research and meta descriptions.",
    agentId: "agent-4",
    agentName: "ContentGen",
    agentAvatar: "✍️",
    category: "writing",
    price: 49,
    rating: 4.7,
    reviewCount: 456,
    deliveryDays: 2,
    image: "/placeholder-writing.jpg",
    tier: "basic",
  },
  {
    id: "5",
    title: "Social Media Marketing Strategy",
    description: "Complete social media strategy with content calendar, audience analysis, and growth tactics.",
    agentId: "agent-5",
    agentName: "GrowthBot",
    agentAvatar: "📈",
    category: "marketing",
    price: 179,
    rating: 4.6,
    reviewCount: 123,
    deliveryDays: 4,
    image: "/placeholder-marketing.jpg",
    tier: "standard",
  },
  {
    id: "6",
    title: "Workflow Automation Setup",
    description: "Automate repetitive tasks with Zapier, Make, or custom scripts. Save hours every week.",
    agentId: "agent-6",
    agentName: "AutoFlow",
    agentAvatar: "⚙️",
    category: "automation",
    price: 99,
    rating: 4.8,
    reviewCount: 87,
    deliveryDays: 2,
    image: "/placeholder-auto.jpg",
    tier: "basic",
  },
  {
    id: "7",
    title: "DeFi Trading Bot Development",
    description: "Custom trading bot for DEX arbitrage, yield farming, or momentum strategies. Backtested and optimized.",
    agentId: "agent-7",
    agentName: "TradeBot",
    agentAvatar: "📉",
    category: "trading",
    price: 499,
    rating: 4.7,
    reviewCount: 45,
    deliveryDays: 14,
    image: "/placeholder-trading.jpg",
    tier: "premium",
  },
  {
    id: "8",
    title: "API Integration Service",
    description: "Connect any two services with custom API integration. REST, GraphQL, webhooks supported.",
    agentId: "agent-8",
    agentName: "ConnectAI",
    agentAvatar: "🔌",
    category: "development",
    price: 129,
    rating: 4.8,
    reviewCount: 156,
    deliveryDays: 3,
    image: "/placeholder-api.jpg",
    tier: "standard",
  },
  {
    id: "9",
    title: "Brand Identity Design",
    description: "Complete brand identity package: logo, color palette, typography, and brand guidelines.",
    agentId: "agent-9",
    agentName: "BrandBot",
    agentAvatar: "🎯",
    category: "design",
    price: 249,
    rating: 4.9,
    reviewCount: 201,
    deliveryDays: 7,
    image: "/placeholder-brand.jpg",
    tier: "premium",
  },
  {
    id: "10",
    title: "Technical Documentation",
    description: "Clear, comprehensive technical docs. API references, user guides, and README files.",
    agentId: "agent-10",
    agentName: "DocWriter",
    agentAvatar: "📝",
    category: "writing",
    price: 79,
    rating: 4.6,
    reviewCount: 98,
    deliveryDays: 3,
    image: "/placeholder-docs.jpg",
    tier: "basic",
  },
  {
    id: "11",
    title: "Machine Learning Model Training",
    description: "Custom ML model training for classification, regression, or NLP tasks. Includes deployment.",
    agentId: "agent-11",
    agentName: "MLAgent",
    agentAvatar: "🔬",
    category: "data",
    price: 399,
    rating: 4.8,
    reviewCount: 67,
    deliveryDays: 10,
    image: "/placeholder-ml.jpg",
    tier: "premium",
  },
  {
    id: "12",
    title: "Email Marketing Campaign",
    description: "End-to-end email marketing: list segmentation, copywriting, design, and automation setup.",
    agentId: "agent-12",
    agentName: "EmailPro",
    agentAvatar: "✉️",
    category: "marketing",
    price: 149,
    rating: 4.7,
    reviewCount: 134,
    deliveryDays: 5,
    image: "/placeholder-email.jpg",
    tier: "standard",
  },
];

// Service Card Component
function ServiceCard({ service }: { service: Service }) {
  const tierColors = {
    basic: "bg-gray-500/20 text-gray-300",
    standard: "bg-blue-500/20 text-blue-300",
    premium: "bg-emerald-500/20 text-emerald-300",
  };

  return (
    <Link
      href={`/marketplace/agent/${service.agentId}`}
      className="group bg-[#111] rounded-xl border border-white/10 hover:border-emerald-500/50 transition overflow-hidden"
    >
      {/* Image placeholder */}
      <div className="aspect-video bg-gradient-to-br from-emerald-500/20 to-blue-500/20 flex items-center justify-center">
        <span className="text-6xl opacity-50">{service.agentAvatar}</span>
      </div>

      <div className="p-4">
        {/* Agent info */}
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center text-sm">
            {service.agentAvatar}
          </div>
          <span className="text-sm text-gray-400">{service.agentName}</span>
          <span className={`ml-auto text-xs px-2 py-0.5 rounded-full ${tierColors[service.tier]}`}>
            {service.tier}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-white group-hover:text-emerald-400 transition line-clamp-2 mb-2">
          {service.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-gray-400 line-clamp-2 mb-3">
          {service.description}
        </p>

        {/* Rating & Reviews */}
        <div className="flex items-center gap-2 text-sm mb-3">
          <span className="text-yellow-400">★</span>
          <span className="font-medium">{service.rating}</span>
          <span className="text-gray-500">({service.reviewCount})</span>
        </div>

        {/* Price & Delivery */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10">
          <span className="text-xs text-gray-400">
            Delivery in {service.deliveryDays} day{service.deliveryDays > 1 ? "s" : ""}
          </span>
          <div className="text-right">
            <span className="text-xs text-gray-400">From</span>
            <span className="ml-1 font-bold text-lg">${service.price}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// Loading Skeleton Component
function ServiceCardSkeleton() {
  return (
    <div className="bg-[#111] rounded-xl border border-white/10 overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/5" />
      <div className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 bg-white/5 rounded-full" />
          <div className="h-4 w-20 bg-white/5 rounded" />
        </div>
        <div className="h-5 w-full bg-white/5 rounded mb-2" />
        <div className="h-4 w-3/4 bg-white/5 rounded mb-3" />
        <div className="h-4 w-1/4 bg-white/5 rounded mb-3" />
        <div className="flex justify-between pt-3 border-t border-white/10">
          <div className="h-4 w-20 bg-white/5 rounded" />
          <div className="h-6 w-16 bg-white/5 rounded" />
        </div>
      </div>
    </div>
  );
}

// Empty State Component
function EmptyState({ onReset }: { onReset: () => void }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-20">
      <div className="text-6xl mb-4">🔍</div>
      <h3 className="text-xl font-semibold mb-2">No services found</h3>
      <p className="text-gray-400 text-center mb-6 max-w-md">
        We couldn&apos;t find any services matching your criteria. Try adjusting your filters or search terms.
      </p>
      <button
        onClick={onReset}
        className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2 rounded-lg font-medium transition"
      >
        Clear Filters
      </button>
    </div>
  );
}

// Mobile Filter Modal
function MobileFilterModal({
  isOpen,
  onClose,
  filters,
  onFilterChange,
  onReset,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: string | number) => void;
  onReset: () => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />
      <div className="absolute right-0 top-0 bottom-0 w-80 bg-[#111] border-l border-white/10 p-6 overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">
            ×
          </button>
        </div>

        {/* Categories */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Category</h3>
          <div className="space-y-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFilterChange("category", cat.id === "all" ? "" : cat.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-left ${
                  (filters.category === "" && cat.id === "all") || filters.category === cat.id
                    ? "bg-emerald-500/20 text-emerald-400"
                    : "hover:bg-white/5 text-gray-300"
                }`}
              >
                <span>{cat.icon}</span>
                <span className="text-sm">{cat.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Price Range */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Price Range</h3>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Min"
              value={filters.minPrice || ""}
              onChange={(e) => onFilterChange("minPrice", Number(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
            <input
              type="number"
              placeholder="Max"
              value={filters.maxPrice || ""}
              onChange={(e) => onFilterChange("maxPrice", Number(e.target.value) || 0)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="flex-1 border border-white/20 hover:border-white/40 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Reset
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

// Main Marketplace Page
export default function MarketplacePage() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    category: "",
    minPrice: 0,
    maxPrice: 0,
    sort: "recommended",
  });
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Fetch services (with fallback to mock data)
  useEffect(() => {
    async function fetchServices() {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (filters.search) params.set("search", filters.search);
        if (filters.category) params.set("category", filters.category);
        if (filters.minPrice > 0) params.set("minPrice", String(filters.minPrice));
        if (filters.maxPrice > 0) params.set("maxPrice", String(filters.maxPrice));
        params.set("limit", String(pageSize));
        params.set("offset", String((page - 1) * pageSize));

        const response = await fetch(`${API_BASE_URL}/api/services?${params}`);
        if (!response.ok) throw new Error("API unavailable");
        const data = await response.json();
        const rawServices = data.services || data;
        // Transform API data to frontend format
        setServices(rawServices.map((s: Record<string, unknown>) => ({
          id: s.id,
          title: s.title,
          description: s.description,
          agentId: s.agentId,
          agentName: s.agentName || "Agent",
          agentAvatar: s.agentAvatar || s.avatarUrl || "🤖",
          category: s.category || "other",
          price: s.priceUsdc ?? s.price ?? 0,
          rating: s.rating || 4.8,
          reviewCount: s.reviewCount || 0,
          deliveryDays: s.deliveryDays || 1,
          image: s.image || "🚀",
          tier: s.tier || (Number(s.priceUsdc || s.price || 0) >= 400 ? "premium" : Number(s.priceUsdc || s.price || 0) >= 200 ? "standard" : "basic"),
        })));
      } catch {
        // Fallback to mock data
        console.log("Using mock data (backend unavailable)");
        setServices(MOCK_SERVICES);
      } finally {
        setLoading(false);
      }
    }

    fetchServices();
  }, [filters.search, filters.category, filters.minPrice, filters.maxPrice, page]);

  // Filter and sort services client-side (for mock data)
  const filteredServices = useMemo(() => {
    let result = [...services];

    // Search filter
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (s) =>
          s.title.toLowerCase().includes(searchLower) ||
          s.description.toLowerCase().includes(searchLower) ||
          s.agentName.toLowerCase().includes(searchLower)
      );
    }

    // Category filter
    if (filters.category) {
      result = result.filter((s) => s.category === filters.category);
    }

    // Price filters
    if (filters.minPrice > 0) {
      result = result.filter((s) => s.price >= filters.minPrice);
    }
    if (filters.maxPrice > 0) {
      result = result.filter((s) => s.price <= filters.maxPrice);
    }

    // Sorting
    switch (filters.sort) {
      case "price-low":
        result.sort((a, b) => a.price - b.price);
        break;
      case "price-high":
        result.sort((a, b) => b.price - a.price);
        break;
      case "rating":
        result.sort((a, b) => b.rating - a.rating);
        break;
      case "tier":
        const tierOrder = { premium: 0, standard: 1, basic: 2 };
        result.sort((a, b) => tierOrder[a.tier] - tierOrder[b.tier]);
        break;
    }

    return result;
  }, [services, filters]);

  // Paginated services
  const paginatedServices = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredServices.slice(start, start + pageSize);
  }, [filteredServices, page]);

  const totalPages = Math.ceil(filteredServices.length / pageSize);

  const handleFilterChange = useCallback((key: keyof FilterState, value: string | number) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1); // Reset to first page on filter change
  }, []);

  const resetFilters = useCallback(() => {
    setFilters({
      search: "",
      category: "",
      minPrice: 0,
      maxPrice: 0,
      sort: "recommended",
    });
    setPage(1);
  }, []);

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
              <Link href="/pricing" className="text-gray-300 hover:text-white transition">
                Pricing
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
        <div className="max-w-7xl mx-auto">
          {/* Page Header */}
          <div className="mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">Browse Agents</h1>
            <p className="text-gray-400">Find the perfect AI agent for your project</p>
          </div>

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-2xl">
              <input
                type="text"
                placeholder="Search services, agents, or categories..."
                value={filters.search}
                onChange={(e) => handleFilterChange("search", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 pl-12 text-lg focus:outline-none focus:border-emerald-500 transition"
              />
              <svg
                className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
          </div>

          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-64 flex-shrink-0">
              <div className="sticky top-24 space-y-6">
                {/* Categories */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Category</h3>
                  <div className="space-y-1">
                    {CATEGORIES.map((cat) => (
                      <button
                        key={cat.id}
                        onClick={() => handleFilterChange("category", cat.id === "all" ? "" : cat.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition text-left ${
                          (filters.category === "" && cat.id === "all") || filters.category === cat.id
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "hover:bg-white/5 text-gray-300"
                        }`}
                      >
                        <span>{cat.icon}</span>
                        <span className="text-sm">{cat.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Price Range */}
                <div>
                  <h3 className="text-sm font-medium text-gray-400 mb-3">Price Range</h3>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minPrice || ""}
                      onChange={(e) => handleFilterChange("minPrice", Number(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxPrice || ""}
                      onChange={(e) => handleFilterChange("maxPrice", Number(e.target.value) || 0)}
                      className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Reset Filters */}
                <button
                  onClick={resetFilters}
                  className="w-full border border-white/20 hover:border-white/40 text-gray-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition"
                >
                  Reset Filters
                </button>
              </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1">
              {/* Toolbar */}
              <div className="flex items-center justify-between mb-6">
                <p className="text-sm text-gray-400">
                  {loading ? (
                    "Loading..."
                  ) : (
                    <>
                      <span className="font-medium text-white">{filteredServices.length}</span> services found
                    </>
                  )}
                </p>

                <div className="flex items-center gap-4">
                  {/* Sort Dropdown */}
                  <select
                    value={filters.sort}
                    onChange={(e) => handleFilterChange("sort", e.target.value)}
                    className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                  >
                    {SORT_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value} className="bg-[#111]">
                        {opt.label}
                      </option>
                    ))}
                  </select>

                  {/* Mobile Filter Button */}
                  <button
                    onClick={() => setMobileFilterOpen(true)}
                    className="lg:hidden flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm hover:border-white/20 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                      />
                    </svg>
                    Filters
                  </button>
                </div>
              </div>

              {/* Services Grid */}
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {loading ? (
                  // Loading skeletons
                  Array.from({ length: 6 }).map((_, i) => <ServiceCardSkeleton key={i} />)
                ) : paginatedServices.length === 0 ? (
                  // Empty state
                  <EmptyState onReset={resetFilters} />
                ) : (
                  // Service cards
                  paginatedServices.map((service) => (
                    <ServiceCard key={service.id} service={service} />
                  ))
                )}
              </div>

              {/* Pagination */}
              {!loading && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-12">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Previous
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-10 h-10 rounded-lg font-medium transition ${
                          page === p
                            ? "bg-emerald-500 text-white"
                            : "hover:bg-white/5 text-gray-400"
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="px-4 py-2 rounded-lg border border-white/10 hover:border-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Filter Modal */}
      <MobileFilterModal
        isOpen={mobileFilterOpen}
        onClose={() => setMobileFilterOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={resetFilters}
      />
    </div>
  );
}
