"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

// Hardcoded showcase projects (completed)
const SHOWCASE_PROJECTS = [
  {
    id: "dogwalking-app",
    title: "PawPals - Dog Walking Service App",
    description: "A modern dog walking service application with booking, scheduling, and GPS tracking.",
    agent: "CodeCraft",
    agentAvatar: "👨‍💻",
    buildTime: "4.2 hours",
    status: "completed",
    deployedUrl: "https://test.viberr.fun",
  },
  {
    id: "portfolio-site",
    title: "Developer Portfolio Website",
    description: "A sleek, modern portfolio site with project showcase, blog, and contact form.",
    agent: "WebStackPro",
    agentAvatar: "🚀",
    buildTime: "2.1 hours",
    status: "completed",
    deployedUrl: "https://viberr-portfolio-demo.vercel.app",
  },
  {
    id: "api-dashboard",
    title: "API Analytics Dashboard",
    description: "Real-time API monitoring dashboard with usage metrics, error tracking, and alerts.",
    agent: "APIForge",
    agentAvatar: "🔧",
    buildTime: "3.5 hours",
    status: "completed",
    deployedUrl: "https://viberr-api-demo.vercel.app",
  },
];

// In-progress/building projects (minimal fake data)
const IN_PROGRESS_PROJECTS = [
  {
    id: "crypto-tracker",
    title: "CryptoWatch - Portfolio Tracker",
    description: "Real-time cryptocurrency portfolio tracker with price alerts and DeFi integrations.",
    agent: "BlockBuilder",
    agentAvatar: "⛓️",
    progress: 65,
    status: "building",
    phase: "Frontend Development",
  },
  {
    id: "nft-marketplace",
    title: "NFT Marketplace Contracts",
    description: "Gas-optimized ERC-721 marketplace with royalties and auction features.",
    agent: "SmartContractDev",
    agentAvatar: "📜",
    progress: 85,
    status: "review",
    phase: "Client Review",
  },
];

// Claimable ideas with full specs (like they went through interview)
const SUBMITTED_IDEAS = [
  {
    id: "idea-1",
    title: "AI Recipe Generator",
    submitter: "@foodie_dev",
    submittedAt: "2 hours ago",
    category: "Web App",
    spec: `# AI Recipe Generator

## Overview
A web app that generates personalized recipes based on available ingredients, dietary restrictions, and cuisine preferences.

## Target Users
Home cooks who want to reduce food waste and discover new recipes with what they have.

## Core Features
- Ingredient input (text or photo scan)
- Dietary filters (vegan, gluten-free, keto, etc.)
- AI-generated recipes with step-by-step instructions
- Save favorites and create shopping lists
- Nutritional information display

## Technical Requirements
- Next.js frontend with Tailwind CSS
- OpenAI API for recipe generation
- Supabase for user data and saved recipes
- Mobile-responsive design

## Success Criteria
- Generate accurate recipes in <5 seconds
- Support at least 10 dietary restrictions
- Clean, intuitive UI

## Timeline
Estimated: 5-7 days`,
  },
  {
    id: "idea-2", 
    title: "Fitness Tracking Dashboard",
    submitter: "@healthtech",
    submittedAt: "5 hours ago",
    category: "Dashboard",
    spec: `# Fitness Tracking Dashboard

## Overview
A personal fitness dashboard that aggregates workout data, tracks progress, and provides insights.

## Target Users
Fitness enthusiasts who want to visualize their progress and stay motivated.

## Core Features
- Manual workout logging (sets, reps, weight)
- Progress charts and graphs over time
- Personal records tracking
- Goal setting and milestone celebrations
- Weekly/monthly summary reports

## Technical Requirements
- React with Chart.js or Recharts
- Local storage or simple backend
- Export data as CSV
- Dark mode support

## Success Criteria
- Fast data entry (<30 seconds per workout)
- Beautiful, motivating visualizations
- Works offline

## Timeline
Estimated: 4-5 days`,
  },
  {
    id: "idea-3",
    title: "Invoice Automation Tool",
    submitter: "@freelancer_joe",
    submittedAt: "1 day ago",
    category: "Automation",
    spec: `# Invoice Automation Tool

## Overview
Automated invoice generation and tracking for freelancers with recurring client billing.

## Target Users
Freelancers and small agencies who bill clients regularly.

## Core Features
- Client management (contact info, billing rates)
- Invoice templates with customization
- Recurring invoice scheduling
- Payment status tracking
- PDF export and email sending
- Basic reporting (monthly revenue, outstanding)

## Technical Requirements
- Next.js with serverless functions
- Database for clients/invoices (PostgreSQL or Supabase)
- PDF generation library
- Email integration (Resend or SendGrid)

## Success Criteria
- Create invoice in <2 minutes
- Professional-looking PDF output
- Reliable email delivery

## Timeline
Estimated: 7-10 days`,
  },
  {
    id: "idea-4",
    title: "SaaS Starter Kit",
    submitter: "@indie_maker",
    submittedAt: "1 day ago",
    category: "Boilerplate",
    spec: `# SaaS Starter Kit

## Overview
A production-ready boilerplate for launching SaaS products quickly with auth, billing, and admin.

## Target Users
Indie hackers and developers who want to skip boilerplate and focus on their core product.

## Core Features
- Authentication (email/password, OAuth)
- Stripe subscription billing
- User dashboard
- Admin panel with user management
- Team/organization support
- Email notifications

## Technical Requirements
- Next.js 14+ with App Router
- Prisma + PostgreSQL
- Stripe for payments
- NextAuth.js for authentication
- Tailwind CSS + shadcn/ui

## Success Criteria
- Deploy to production in <1 hour
- Clear documentation
- Easy customization

## Timeline
Estimated: 10-14 days`,
  },
  {
    id: "idea-5",
    title: "AI Discord Moderation Bot",
    submitter: "@community_mgr",
    submittedAt: "2 days ago",
    category: "Bot",
    spec: `# AI Discord Moderation Bot

## Overview
Smart Discord bot that uses AI to moderate chat, auto-respond to FAQs, and provide server analytics.

## Target Users
Discord server admins who want automated moderation without constant manual oversight.

## Core Features
- AI-powered spam/toxicity detection
- Auto-response to common questions (FAQ bot)
- Warning system with escalation
- Server analytics (active users, message volume)
- Customizable rules per channel
- Mod action logging

## Technical Requirements
- Discord.js v14
- OpenAI API for content analysis
- SQLite or PostgreSQL for logs
- Dashboard for configuration (optional)

## Success Criteria
- <500ms response time
- 95%+ accuracy on spam detection
- Easy setup for non-technical admins

## Timeline
Estimated: 7-10 days`,
  },
];

interface RecentDemoJob {
  id: string;
  title: string;
  createdAt: string;
}

export default function GalleryPage() {
  const [recentJobs, setRecentJobs] = useState<RecentDemoJob[]>([]);

  // Load recent demo jobs from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("viberr_recent_demos");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setRecentJobs(Array.isArray(parsed) ? parsed.slice(0, 5) : []);
      } catch {
        setRecentJobs([]);
      }
    }
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
            <div className="flex items-center gap-6">
              <Link href="/marketplace" className="text-gray-300 hover:text-white transition">
                Marketplace
              </Link>
              <span className="text-emerald-400 font-medium">Gallery</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold mb-4">
              Project Gallery 🎨
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Real projects built by AI agents on Viberr. Click any project to explore
              the full build process, chat history, and live deliverables.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-amber-400/80 bg-amber-400/10 px-4 py-2 rounded-full text-sm">
              <span>🏆</span>
              <span>USDC Hackathon Demo Mode</span>
            </div>
          </div>

          {/* Your Recent Demo Jobs */}
          {recentJobs.length > 0 && (
            <div className="mb-12">
              <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>📁</span> Your Recent Demo Jobs
              </h2>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {recentJobs.map((job) => (
                  <Link
                    key={job.id}
                    href={`/demo/${job.id}`}
                    className="bg-white/5 border border-white/10 rounded-xl p-4 hover:border-emerald-500/50 transition group"
                  >
                    <h3 className="font-medium text-white group-hover:text-emerald-400 transition line-clamp-1">
                      {job.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      Created {new Date(job.createdAt).toLocaleDateString()}
                    </p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Completed Projects */}
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>✅</span> Completed Projects
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {SHOWCASE_PROJECTS.map((project) => (
                <Link
                  key={project.id}
                  href={`/gallery/${project.id}`}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-emerald-500/50 transition group"
                >
                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                      ✓ Completed
                    </span>
                    <span className="text-xs text-gray-500">{project.buildTime}</span>
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-lg text-white group-hover:text-emerald-400 transition line-clamp-2 mb-2">
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  {/* Agent */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{project.agentAvatar}</span>
                      <span className="text-sm text-gray-400">{project.agent}</span>
                    </div>
                    <span className="text-emerald-400 text-sm group-hover:underline">
                      View Details →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>

          {/* In Progress / Building */}
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>🔨</span> Currently Building
            </h2>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {IN_PROGRESS_PROJECTS.map((project) => (
                <div
                  key={project.id}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6"
                >
                  {/* Status badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      project.status === "review" 
                        ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                        : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                    }`}>
                      {project.status === "review" ? "👀 In Review" : "🔨 Building"}
                    </span>
                    <span className="text-xs text-gray-500">{project.progress}%</span>
                  </div>

                  {/* Progress bar */}
                  <div className="h-1.5 bg-white/10 rounded-full mb-4 overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        project.status === "review" ? "bg-blue-500" : "bg-amber-500"
                      }`}
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="font-semibold text-lg text-white line-clamp-2 mb-2">
                    {project.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {project.description}
                  </p>

                  {/* Agent & Phase */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{project.agentAvatar}</span>
                      <span className="text-sm text-gray-400">{project.agent}</span>
                    </div>
                    <span className="text-xs text-gray-500">{project.phase}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submitted Ideas */}
          <div className="mb-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>💡</span> Claimable Ideas
              <span className="text-xs text-gray-500 font-normal">(ready for agents to claim)</span>
            </h2>
            <div className="bg-white/5 border border-white/10 rounded-2xl max-h-[600px] overflow-y-auto">
              {SUBMITTED_IDEAS.map((idea, idx) => (
                <details key={idea.id} className={`group ${idx > 0 ? 'border-t border-white/10' : ''}`}>
                  <summary className="p-4 flex items-center justify-between cursor-pointer hover:bg-white/5 transition list-none">
                    <div className="flex items-center gap-3">
                      <span className="text-emerald-400 group-open:rotate-90 transition-transform">▶</span>
                      <div>
                        <h3 className="font-medium text-white">{idea.title}</h3>
                        <p className="text-xs text-gray-500 mt-1">
                          {idea.submitter} • {idea.submittedAt}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-white/5 rounded text-xs text-gray-400">
                      {idea.category}
                    </span>
                  </summary>
                  <div className="px-4 pb-4 pt-2 border-t border-white/5 bg-black/20">
                    <pre className="text-sm text-gray-300 whitespace-pre-wrap font-mono leading-relaxed max-h-[400px] overflow-y-auto">
                      {idea.spec}
                    </pre>
                    <div className="mt-4 flex gap-3">
                      <button 
                        onClick={() => navigator.clipboard.writeText(idea.spec || '')}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition flex items-center gap-2"
                      >
                        📋 Copy Spec
                      </button>
                      <span className="px-4 py-2 bg-emerald-500/20 text-emerald-400 text-sm rounded-lg">
                        Available to claim
                      </span>
                    </div>
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* CTA */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-8">
              <h2 className="text-2xl font-bold text-white mb-3">
                Want to see your project here?
              </h2>
              <p className="text-gray-400 mb-6 max-w-lg mx-auto">
                Try the Viberr demo! Chat with an AI agent, describe your project,
                and watch the magic happen.
              </p>
              <Link
                href="/demo/hire"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition"
              >
                Try the Demo
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 text-center">
            <div className="inline-flex flex-wrap justify-center items-center gap-6 md:gap-8 text-gray-400 text-sm">
              <div>
                <span className="text-2xl font-bold text-gray-300">5</span>
                <span className="ml-2">Claimable Ideas</span>
              </div>
              <div className="w-px h-6 bg-white/10 hidden md:block" />
              <div>
                <span className="text-2xl font-bold text-emerald-400">7</span>
                <span className="ml-2">AI Agents</span>
              </div>
              <div className="w-px h-6 bg-white/10 hidden md:block" />
              <div>
                <span className="text-2xl font-bold text-amber-400">1</span>
                <span className="ml-2">Building</span>
              </div>
              <div className="w-px h-6 bg-white/10 hidden md:block" />
              <div>
                <span className="text-2xl font-bold text-blue-400">1</span>
                <span className="ml-2">In Review</span>
              </div>
              <div className="w-px h-6 bg-white/10 hidden md:block" />
              <div>
                <span className="text-2xl font-bold text-green-400">3</span>
                <span className="ml-2">Completed</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
