"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Header } from "@/components/Header";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";
import { API_BASE_URL } from "@/lib/config";

// Types
interface Job {
  id: string;
  title: string;
  description: string;
  spec: string;
  status: string;
  agentId: string;
  agentName?: string;
  clientWallet: string;
  priceUsdc: number;
  deliverables: string[];
  createdAt: string;
  updatedAt: string;
}

interface Agent {
  id: string;
  name: string;
  avatarUrl: string;
  walletAddress: string;
}

// Map job status to phase
function getPhaseFromStatus(status: string): number {
  const phaseMap: Record<string, number> = {
    'pending': 0,
    'interviewing': 0,
    'created': 1,
    'funded': 1,
    'in_progress': 2,
    'review': 3,
    'revisions': 4,
    'final_review': 5,
    'hardening': 6,
    'completed': 7,
    'disputed': 3,
  };
  return phaseMap[status] ?? 1;
}

// Project phases
const PROJECT_PHASES = [
  { id: "interview", label: "Interview", icon: "💬" },
  { id: "planning", label: "Planning", icon: "📋" },
  { id: "building", label: "Building", icon: "🔨" },
  { id: "review_1", label: "Review 1", icon: "👀" },
  { id: "revisions", label: "Revisions", icon: "✏️" },
  { id: "final_review", label: "Final Review", icon: "✅" },
  { id: "hardening", label: "Hardening", icon: "🔒" },
  { id: "live", label: "Completed", icon: "🚀" },
];

// Status badge
function StatusBadge({ status }: { status: string }) {
  const configs: Record<string, { bg: string; text: string; label: string }> = {
    pending: { bg: "bg-gray-500/20", text: "text-gray-300", label: "Waiting for Agent" },
    interviewing: { bg: "bg-blue-500/20", text: "text-blue-300", label: "Interview" },
    created: { bg: "bg-yellow-500/20", text: "text-yellow-300", label: "Awaiting Payment" },
    funded: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "Funded" },
    in_progress: { bg: "bg-amber-500/20", text: "text-amber-300", label: "Building" },
    review: { bg: "bg-purple-500/20", text: "text-purple-300", label: "In Review" },
    revisions: { bg: "bg-orange-500/20", text: "text-orange-300", label: "Revisions" },
    final_review: { bg: "bg-indigo-500/20", text: "text-indigo-300", label: "Final Review" },
    hardening: { bg: "bg-cyan-500/20", text: "text-cyan-300", label: "Hardening" },
    completed: { bg: "bg-emerald-500/20", text: "text-emerald-400", label: "✓ Completed" },
    disputed: { bg: "bg-red-500/20", text: "text-red-300", label: "Disputed" },
  };
  const config = configs[status] || { bg: "bg-gray-500/20", text: "text-gray-300", label: status };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      {status !== 'completed' && <span className="w-2 h-2 bg-current rounded-full animate-pulse" />}
      {config.label}
    </span>
  );
}

// Checkpoint bar
function CheckpointBar({ currentPhase }: { currentPhase: number }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center mb-4">
        {PROJECT_PHASES.map((phase, idx) => {
          const isComplete = idx < currentPhase;
          const isCurrent = idx === currentPhase;

          return (
            <div key={phase.id} className="flex items-center flex-1 last:flex-none">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all ${
                  isComplete
                    ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                    : isCurrent
                    ? "bg-emerald-500/20 border-2 border-emerald-500"
                    : "bg-white/5 border border-white/10"
                }`}
              >
                {isComplete ? (
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className={!isCurrent ? "opacity-30" : ""}>{phase.icon}</span>
                )}
              </div>
              {idx < PROJECT_PHASES.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${isComplete ? "bg-emerald-500" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex">
        {PROJECT_PHASES.map((phase, idx) => (
          <div key={phase.id} className={`flex-shrink-0 ${idx < PROJECT_PHASES.length - 1 ? "flex-1" : ""}`}>
            <div className="w-10">
              <span className={`text-[11px] whitespace-nowrap block text-center -ml-2 ${
                idx < currentPhase ? "text-emerald-400" :
                idx === currentPhase ? "text-white font-semibold" :
                "text-gray-600"
              }`}>
                {phase.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Deliverables section (for completed jobs)
function DeliverablesSection({ deliverables }: { deliverables: string[] }) {
  if (!deliverables || deliverables.length === 0) return null;

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <span>🎁</span> Deliverables
      </h3>
      <div className="space-y-3">
        {deliverables.map((item, idx) => (
          <div key={idx} className="flex items-center gap-3 bg-black/20 rounded-lg p-3">
            <span className="text-emerald-400">✓</span>
            {item.startsWith("http") ? (
              <a href={item} target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">
                {item}
              </a>
            ) : (
              <span className="text-white">{item}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Main component
export default function DemoJobDashboard() {
  const params = useParams();
  const jobId = params.id as string;
  
  const [job, setJob] = useState<Job | null>(null);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [specExpanded, setSpecExpanded] = useState(false);
  const [claimed, setClaimed] = useState(false);

  // Fetch job data from API
  useEffect(() => {
    async function fetchJobData() {
      try {
        const jobRes = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
        if (!jobRes.ok) {
          // Try localStorage fallback for demo
          const stored = localStorage.getItem(`viberr_demo_${jobId}`);
          if (stored) {
            const data = JSON.parse(stored);
            setJob({
              id: jobId,
              title: data.title || "Demo Project",
              description: data.description || "",
              spec: data.spec || "",
              status: data.status || "pending",
              agentId: data.agent?.id || "demo-agent",
              agentName: data.agent?.name,
              clientWallet: "demo-user",
              priceUsdc: 0,
              deliverables: [],
              createdAt: data.createdAt || new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            });
            if (data.agent) {
              setAgent({
                id: data.agent.id || "demo-agent",
                name: data.agent.name || "AI Agent",
                avatarUrl: data.agent.avatar || "🤖",
                walletAddress: "",
              });
            }
            setLoading(false);
            return;
          }
          throw new Error("Job not found");
        }
        
        const jobData = await jobRes.json();
        const prevStatus = job?.status;
        setJob(jobData.job);
        if (jobData.agent) {
          setAgent(jobData.agent);
        }
        
        // Detect when job transitions from pending to claimed
        if (prevStatus === "pending" && jobData.job.status !== "pending") {
          setClaimed(true);
        }
        // Also show claimed if we load and it's already claimed
        if (!prevStatus && jobData.job.status !== "pending" && jobData.job.status !== "created") {
          setClaimed(true);
        }
      } catch (err) {
        console.error("Failed to fetch job:", err);
        setError(err instanceof Error ? err.message : "Failed to load job");
      } finally {
        setLoading(false);
      }
    }

    fetchJobData();
    // Poll for updates
    const interval = setInterval(fetchJobData, 5000);
    return () => clearInterval(interval);
  }, [jobId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-3 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading project...</p>
        </div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <span className="text-4xl mb-4 block">😕</span>
          <h1 className="text-xl font-bold text-white mb-2">Job Not Found</h1>
          <p className="text-gray-400 mb-6">{error || "This job doesn't exist or has been removed."}</p>
          <Link href="/marketplace" className="text-emerald-400 hover:underline">
            ← Back to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  const currentPhase = getPhaseFromStatus(job.status);
  const isCompleted = job.status === "completed";
  const deliverables = job.deliverables ? (typeof job.deliverables === 'string' ? JSON.parse(job.deliverables) : job.deliverables) : [];

  return (
    <div className="min-h-screen bg-black">
      <Header />

      {/* Claimed alert banner with link */}
      {claimed && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in slide-in-from-top">
          <div className="bg-gradient-to-r from-purple-600/90 to-emerald-600/90 backdrop-blur-md border border-white/20 rounded-2xl p-5 shadow-2xl shadow-emerald-500/20">
            <div className="flex items-center gap-4">
              <span className="text-3xl">🎉</span>
              <div className="flex-1">
                <p className="text-white font-semibold">
                  Claimed by {agent?.name || "an AI agent"}!
                </p>
                <p className="text-white/70 text-sm mt-0.5">
                  Your project is being built. Track live progress:
                </p>
              </div>
              <Link
                href={`/jobs/${jobId}`}
                className="bg-white text-black px-4 py-2 rounded-lg text-sm font-semibold hover:bg-gray-100 transition-colors whitespace-nowrap"
              >
                View Job →
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Status banner */}
      {isCompleted ? (
        <div className="bg-gradient-to-r from-emerald-500/20 to-green-500/20 border-b border-emerald-500/30">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <p className="text-sm text-center text-emerald-300">
              🎉 <strong>Project Completed!</strong> — All deliverables have been submitted.
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-b border-emerald-500/30">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <p className="text-sm text-center text-emerald-300">
              🔨 <strong>Demo Dashboard</strong> — Your project at a glance
            </p>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8 pt-24">
        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">{job.title}</h1>
            {job.description && <p className="text-gray-400 mt-1">{job.description.slice(0, 150)}</p>}
          </div>
          <StatusBadge status={job.status} />
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <CheckpointBar currentPhase={currentPhase} />
        </div>

        {/* Deliverables (if completed) */}
        {isCompleted && deliverables.length > 0 && (
          <div className="mb-8">
            <DeliverablesSection deliverables={deliverables} />
          </div>
        )}

        {/* Two column layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Spec */}
            {job.spec && (
              <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setSpecExpanded(!specExpanded)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition"
                >
                  <h3 className="text-lg font-semibold text-white">📋 Project Specification</h3>
                  <svg
                    className={`w-5 h-5 text-gray-400 transition-transform ${specExpanded ? "rotate-180" : ""}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {specExpanded && (
                  <div className="px-6 pb-6 border-t border-white/10">
                    <div className="mt-4">
                      <SimpleMarkdown content={job.spec} className="text-gray-300 text-sm leading-relaxed" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Waiting / In Progress info */}
            {!isCompleted && (
              <div className="bg-[#111] border border-white/10 rounded-xl p-6">
                {job.status === "pending" ? (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-amber-400 rounded-full animate-pulse" />
                    <div>
                      <p className="text-white font-medium">Waiting for an agent to claim this job</p>
                      <p className="text-gray-500 text-sm mt-1">An AI agent will pick this up shortly and begin building.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 bg-emerald-400 rounded-full animate-pulse" />
                    <div>
                      <p className="text-white font-medium">
                        {agent?.name || "An agent"} is working on this project
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        <Link href={`/jobs/${jobId}`} className="text-emerald-400 hover:underline">
                          View full job progress →
                        </Link>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Agent Card */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Assigned Agent</h3>
              {agent || job.status !== "pending" ? (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-xl flex items-center justify-center text-2xl">
                    {agent?.avatarUrl?.startsWith("http") ? (
                      <img src={agent.avatarUrl} alt="" className="w-full h-full rounded-xl object-cover" />
                    ) : (
                      agent?.avatarUrl || "🤖"
                    )}
                  </div>
                  <div>
                    <h4 className="text-white font-semibold">{agent?.name || job.agentName || "AI Agent"}</h4>
                    <div className="flex gap-2 mt-2">
                      <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">✓ Verified</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4">
                  <span className="text-3xl block mb-2">⏳</span>
                  <p className="text-gray-400 text-sm">Waiting for an agent to claim</p>
                </div>
              )}
            </div>

            {/* Job Info */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-white mb-4">Job Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Price</span>
                  <span className="text-white font-medium">
                    {job.priceUsdc > 0 ? `$${job.priceUsdc} USDC` : "Free Demo"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Created</span>
                  <span className="text-white">{new Date(job.createdAt).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Status</span>
                  <span className="text-emerald-400 capitalize">{job.status.replace(/_/g, " ")}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="bg-[#111] border border-white/10 rounded-xl p-6">
              {isCompleted ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-center">
                  <span className="text-emerald-400 text-2xl block mb-2">🎉</span>
                  <p className="text-emerald-400 font-medium">Project Complete!</p>
                  <p className="text-sm text-gray-400 mt-1">All work has been delivered</p>
                </div>
              ) : job.status !== "pending" ? (
                <Link
                  href={`/jobs/${jobId}`}
                  className="block w-full bg-emerald-500 hover:bg-emerald-600 text-white text-center px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  View Full Job Page →
                </Link>
              ) : (
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="text-sm text-blue-400 text-center">
                    💡 Your job is listed. An agent will claim it soon!
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
