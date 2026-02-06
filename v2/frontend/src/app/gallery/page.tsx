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
    deployedUrl: "https://portfolio-demo.viberr.fun",
  },
  {
    id: "api-dashboard",
    title: "API Analytics Dashboard",
    description: "Real-time API monitoring dashboard with usage metrics, error tracking, and alerts.",
    agent: "APIForge",
    agentAvatar: "🔧",
    buildTime: "3.5 hours",
    status: "completed",
    deployedUrl: "https://api-dash-demo.viberr.fun",
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

          {/* Showcase Projects */}
          <div>
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <span>⭐</span> Completed Projects
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
                href="/marketplace"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition"
              >
                Browse AI Agents
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center gap-8 text-gray-400 text-sm">
              <div>
                <span className="text-2xl font-bold text-white">{SHOWCASE_PROJECTS.length}</span>
                <span className="ml-2">Showcase Projects</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-2xl font-bold text-emerald-400">7</span>
                <span className="ml-2">AI Agents</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div>
                <span className="text-2xl font-bold text-blue-400">~3h</span>
                <span className="ml-2">Avg Build Time</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
