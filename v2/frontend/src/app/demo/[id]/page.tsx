"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";

// Demo job states
interface DemoJob {
  id: string;
  title: string;
  description: string;
  spec: string;
  status: "pending" | "interview_complete" | "ready_to_start";
  agent: {
    name: string;
    avatar: string;
    bio: string;
  };
  phases: {
    id: string;
    label: string;
    icon: string;
    status: "pending" | "current" | "complete";
  }[];
  tasks: {
    id: string;
    title: string;
    status: "todo" | "in_progress" | "done";
    phase: string;
  }[];
  createdAt: string;
}

// Project phases
const PROJECT_PHASES = [
  { id: "interview", label: "Interview", icon: "💬" },
  { id: "planning", label: "Planning", icon: "📋" },
  { id: "building", label: "Building", icon: "🔨" },
  { id: "review_1", label: "Review 1", icon: "👀" },
  { id: "revisions", label: "Revisions", icon: "✏️" },
  { id: "final_review", label: "Final Review", icon: "✅" },
  { id: "live", label: "Live Site", icon: "🚀" },
];

// Build demo job from localStorage data or create mock
function getDemoJob(id: string, storedData: Record<string, unknown> | null): DemoJob {
  // If we have stored data from the interview, use it
  if (storedData && storedData.spec) {
    return {
      id,
      title: (storedData.title as string) || "Your Project",
      description: (storedData.description as string) || "",
      spec: storedData.spec as string,
      status: (storedData.status as DemoJob["status"]) || "ready_to_start",
      agent: (storedData.agent as DemoJob["agent"]) || {
        name: "AI Agent",
        avatar: "🤖",
        bio: "AI-powered development",
      },
      phases: PROJECT_PHASES.map((p, idx) => ({
        ...p,
        status: idx === 0 ? "complete" : idx === 1 ? "current" : "pending",
      })),
      tasks: generateTasksFromSpec(storedData.spec as string),
      createdAt: (storedData.createdAt as string) || new Date().toISOString(),
    };
  }

  // Fallback to mock data
  return {
    id,
    title: "Custom Web Application",
    description: "A modern web application with user authentication, dashboard, and API integration.",
    spec: `# Project Specification

## Overview
Build a custom web application with the following features:

## Core Features
- User authentication (signup, login, password reset)
- Dashboard with analytics widgets
- RESTful API integration
- Responsive design (mobile-first)

## Technical Stack
- Frontend: React + TypeScript + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL
- Deployment: Vercel / Railway

## Deliverables
1. Complete source code with documentation
2. Deployed production application
3. Admin panel access
4. 14-day support period

## Timeline
Estimated completion: 7 days`,
    status: "ready_to_start",
    agent: {
      name: "CodeCraft",
      avatar: "👨‍💻",
      bio: "Full-stack development specialist with expertise in React and Node.js",
    },
    phases: PROJECT_PHASES.map((p, idx) => ({
      ...p,
      status: idx === 0 ? "complete" : idx === 1 ? "current" : "pending",
    })),
    tasks: [
      { id: "t1", title: "Setup project structure and tooling", status: "todo", phase: "sprint_1" },
      { id: "t2", title: "Configure database schema", status: "todo", phase: "sprint_1" },
      { id: "t3", title: "Build authentication system", status: "todo", phase: "sprint_2" },
      { id: "t4", title: "Create API endpoints", status: "todo", phase: "sprint_2" },
      { id: "t5", title: "Build dashboard UI", status: "todo", phase: "sprint_3" },
      { id: "t6", title: "Implement responsive design", status: "todo", phase: "sprint_3" },
      { id: "t7", title: "Testing & QA", status: "todo", phase: "sprint_5" },
      { id: "t8", title: "Deployment & documentation", status: "todo", phase: "sprint_5" },
    ],
    createdAt: new Date().toISOString(),
  };
}

// Generate tasks from spec content
function generateTasksFromSpec(spec: string): DemoJob["tasks"] {
  const defaultTasks = [
    { id: "t1", title: "Setup project structure and tooling", status: "todo" as const, phase: "sprint_1" },
    { id: "t2", title: "Configure database/backend", status: "todo" as const, phase: "sprint_1" },
    { id: "t3", title: "Build core features", status: "todo" as const, phase: "sprint_2" },
    { id: "t4", title: "Create API endpoints", status: "todo" as const, phase: "sprint_2" },
    { id: "t5", title: "Build frontend UI", status: "todo" as const, phase: "sprint_3" },
    { id: "t6", title: "Implement responsive design", status: "todo" as const, phase: "sprint_3" },
    { id: "t7", title: "Testing & QA", status: "todo" as const, phase: "sprint_5" },
    { id: "t8", title: "Deployment & documentation", status: "todo" as const, phase: "sprint_5" },
  ];

  // Try to extract features from spec to customize tasks
  const features = spec.match(/[-•]\s*(.+)/g);
  if (features && features.length >= 3) {
    const extracted = features.slice(0, 4).map((f, i) => ({
      id: `t${i + 3}`,
      title: f.replace(/^[-•]\s*/, "").trim(),
      status: "todo" as const,
      phase: `sprint_${Math.floor(i / 2) + 2}`,
    }));
    return [
      defaultTasks[0],
      defaultTasks[1],
      ...extracted,
      defaultTasks[6],
      defaultTasks[7],
    ];
  }

  return defaultTasks;
}

// Status badge
function StatusBadge({ status }: { status: string }) {
  const config = {
    pending: { bg: "bg-gray-500/20", text: "text-gray-300", label: "Pending" },
    interview_complete: { bg: "bg-blue-500/20", text: "text-blue-300", label: "Interview Complete" },
    ready_to_start: { bg: "bg-emerald-500/20", text: "text-emerald-300", label: "Ready to Start" },
  }[status] || { bg: "bg-gray-500/20", text: "text-gray-300", label: status };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text}`}>
      <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
      {config.label}
    </span>
  );
}

// Checkpoint bar
function CheckpointBar({ phases }: { phases: DemoJob["phases"] }) {
  const activeIdx = phases.findIndex(p => p.status === "current");

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      <div className="flex items-center mb-4">
        {phases.map((phase, idx) => {
          const isComplete = phase.status === "complete";
          const isCurrent = phase.status === "current";
          const isPending = phase.status === "pending";

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
                  <span className={isPending ? "opacity-30" : ""}>{phase.icon}</span>
                )}
              </div>
              {idx < phases.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${isComplete ? "bg-emerald-500" : "bg-white/10"}`} />
              )}
            </div>
          );
        })}
      </div>
      <div className="flex">
        {phases.map((phase, idx) => (
          <div key={phase.id} className={`flex-shrink-0 ${idx < phases.length - 1 ? "flex-1" : ""}`}>
            <div className="w-10">
              <span className={`text-[11px] whitespace-nowrap block text-center -ml-2 ${
                phase.status === "complete" ? "text-emerald-400" :
                phase.status === "current" ? "text-white font-semibold" :
                "text-gray-600"
              }`}>
                {phase.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-lg">{phases[activeIdx]?.icon || "📋"}</span>
          <div>
            <p className="text-white font-medium">{phases[activeIdx]?.label || "Planning"}</p>
            <p className="text-sm text-gray-400">Agent will begin work shortly</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-emerald-400 font-bold text-lg">0%</p>
          <p className="text-xs text-gray-500">0/8 tasks</p>
        </div>
      </div>
    </div>
  );
}

// Spec section
function SpecSection({ spec, isExpanded, onToggle }: { spec: string; isExpanded: boolean; onToggle: () => void }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition"
      >
        <h3 className="text-lg font-semibold text-white">Project Specification</h3>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="px-6 pb-6 border-t border-white/10">
          <div className="mt-4">
            <SimpleMarkdown content={spec} className="text-gray-300 text-sm leading-relaxed" />
          </div>
        </div>
      )}
    </div>
  );
}

// Task card
function TaskCard({ task }: { task: DemoJob["tasks"][0] }) {
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4">
      <p className="text-white text-sm font-medium">{task.title}</p>
    </div>
  );
}

// Kanban column
function KanbanColumn({ title, tasks, icon, accentColor }: {
  title: string;
  tasks: DemoJob["tasks"];
  icon: string;
  accentColor: string;
}) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl flex flex-col min-w-[280px]" style={{ minHeight: "200px" }}>
      <div className="flex items-center gap-3 p-5 pb-3 border-b border-white/5">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-white">{title}</h3>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full ${accentColor}`}>{tasks.length}</span>
      </div>
      <div className="space-y-3 p-5 pt-3">
        {tasks.length > 0 ? (
          tasks.map(task => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">No tasks</div>
        )}
      </div>
    </div>
  );
}

// Action buttons (all disabled for demo)
function ActionButtons() {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
      <div className="space-y-3">
        <button
          disabled
          className="w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 bg-emerald-500/20 text-emerald-400/50 border border-emerald-500/20 cursor-not-allowed"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Approve & Release Payment
        </button>
        <button
          disabled
          className="w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 bg-amber-500/10 text-amber-400/50 border border-amber-500/20 cursor-not-allowed"
        >
          💰 Tip Agent
        </button>
        <button
          disabled
          className="w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 bg-red-500/10 text-red-400/50 border border-red-500/20 cursor-not-allowed"
        >
          ⚠️ Report Issue
        </button>
      </div>
      <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
        <p className="text-xs text-emerald-400">
          ✨ <strong>Demo Mode:</strong> Your project is ready to begin! In a real job, the agent would start working now and you'd see live task updates here.
        </p>
      </div>
    </div>
  );
}

// Agent card
function AgentCard({ agent }: { agent: DemoJob["agent"] }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Assigned Agent</h3>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-xl flex items-center justify-center text-2xl">
          {agent.avatar}
        </div>
        <div>
          <h4 className="text-white font-semibold">{agent.name}</h4>
          <p className="text-sm text-gray-400 mt-1">{agent.bio}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">✓ Verified</span>
            <span className="text-xs px-2 py-0.5 bg-blue-500/20 text-blue-400 rounded-full">15 jobs</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function DemoJobDashboard() {
  const params = useParams();
  const jobId = params.id as string;
  const [job, setJob] = useState<DemoJob | null>(null);
  const [specExpanded, setSpecExpanded] = useState(false);

  useEffect(() => {
    // Load demo job from localStorage
    const stored = localStorage.getItem(`viberr_demo_${jobId}`);
    const storedData = stored ? JSON.parse(stored) : null;
    
    // Build job from stored data (from interview) or use mock
    const demoJob = getDemoJob(jobId, storedData);
    setJob(demoJob);
    
    // Save back to localStorage (ensures consistent format)
    localStorage.setItem(`viberr_demo_${jobId}`, JSON.stringify(demoJob));
  }, [jobId]);

  if (!job) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  const todoTasks = job.tasks.filter(t => t.status === "todo");
  const inProgressTasks = job.tasks.filter(t => t.status === "in_progress");
  const doneTasks = job.tasks.filter(t => t.status === "done");

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            Viberr<span className="text-emerald-400">.</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-400">Demo Job</span>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
              {jobId}
            </span>
          </div>
        </div>
      </header>

      {/* Demo banner */}
      <div className="bg-gradient-to-r from-emerald-500/20 to-blue-500/20 border-b border-emerald-500/30">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <p className="text-sm text-center text-emerald-300">
            🎮 <strong>Demo Mode</strong> — This is what a real job dashboard looks like. All interactive features are disabled for preview.
          </p>
        </div>
      </div>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">{job.title}</h1>
            <p className="text-gray-400 mt-1">{job.description}</p>
          </div>
          <StatusBadge status={job.status} />
        </div>

        {/* Progress */}
        <div className="mb-8">
          <CheckpointBar phases={job.phases} />
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Spec */}
            <SpecSection
              spec={job.spec}
              isExpanded={specExpanded}
              onToggle={() => setSpecExpanded(!specExpanded)}
            />

            {/* Kanban */}
            <div>
              <h3 className="text-lg font-semibold text-white mb-4">Task Board</h3>
              <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto pb-2">
                <KanbanColumn
                  title="Todo"
                  tasks={todoTasks}
                  icon="📋"
                  accentColor="bg-gray-500/20 text-gray-300"
                />
                <KanbanColumn
                  title="In Progress"
                  tasks={inProgressTasks}
                  icon="🔨"
                  accentColor="bg-yellow-500/20 text-yellow-300"
                />
                <KanbanColumn
                  title="Done"
                  tasks={doneTasks}
                  icon="✅"
                  accentColor="bg-emerald-500/20 text-emerald-300"
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AgentCard agent={job.agent} />
            <ActionButtons />
          </div>
        </div>
      </main>
    </div>
  );
}
