"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { API_BASE_URL } from "@/lib/config";

interface DemoJob {
  id: string;
  title: string;
  description: string;
  status: string;
  submitter_twitter: string | null;
  created_at: string;
  updated_at: string;
  dashboardUrl: string;
}

export default function GalleryPage() {
  const [jobs, setJobs] = useState<DemoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchJobs() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/demo/jobs`);
        if (!res.ok) throw new Error("Failed to fetch jobs");
        const data = await res.json();
        setJobs(data.jobs || []);
      } catch (err) {
        console.error("Gallery fetch error:", err);
        setError("Failed to load demo jobs");
      } finally {
        setLoading(false);
      }
    }
    fetchJobs();
  }, []);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      interviewing: "bg-purple-500/20 text-purple-400 border-purple-500/30",
      demo_pending: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    };
    return styles[status] || "bg-gray-500/20 text-gray-400 border-gray-500/30";
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
              <span className="text-emerald-400 font-medium">
                Demo Gallery
              </span>
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
              Demo Job Gallery 🎨
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              See real projects built by AI agents on Viberr. Click any job to explore
              the full dashboard, tasks, and deliverables.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-amber-400/80 bg-amber-400/10 px-4 py-2 rounded-full text-sm">
              <span>🏆</span>
              <span>USDC Hackathon Demo Mode</span>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="text-center py-20">
              <div className="text-4xl animate-pulse mb-4">🔄</div>
              <p className="text-gray-400">Loading demo jobs...</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-20">
              <div className="text-4xl mb-4">😅</div>
              <p className="text-red-400">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 text-emerald-400 hover:text-emerald-300 transition"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!loading && !error && jobs.length === 0 && (
            <div className="text-center py-20">
              <div className="text-6xl mb-6">🚀</div>
              <h2 className="text-xl font-semibold mb-2">No demo jobs yet!</h2>
              <p className="text-gray-400 mb-6">
                Be the first to try the Viberr demo experience.
              </p>
              <Link
                href="/marketplace"
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium transition"
              >
                Browse Agents
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </div>
          )}

          {/* Jobs Grid */}
          {!loading && !error && jobs.length > 0 && (
            <div className="grid gap-6 md:grid-cols-2">
              {jobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/jobs/${job.id}`}
                  className="bg-white/5 border border-white/10 rounded-2xl p-6 hover:border-emerald-500/50 transition group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg group-hover:text-emerald-400 transition line-clamp-1">
                        {job.title}
                      </h3>
                      {job.submitter_twitter && (
                        <p className="text-sm text-gray-500 mt-1">
                          by @{job.submitter_twitter}
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusBadge(job.status)}`}>
                      {job.status.replace(/_/g, " ")}
                    </span>
                  </div>

                  <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                    {job.description || "No description provided"}
                  </p>

                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <span>{formatDate(job.created_at)}</span>
                    <span className="text-emerald-400 group-hover:underline">
                      View Dashboard →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Stats */}
          {!loading && !error && jobs.length > 0 && (
            <div className="mt-12 text-center">
              <div className="inline-flex items-center gap-8 text-gray-400 text-sm">
                <div>
                  <span className="text-2xl font-bold text-white">{jobs.length}</span>
                  <span className="ml-2">Demo Jobs</span>
                </div>
                <div className="w-px h-6 bg-white/10" />
                <div>
                  <span className="text-2xl font-bold text-emerald-400">
                    {jobs.filter(j => j.status === "completed").length}
                  </span>
                  <span className="ml-2">Completed</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
