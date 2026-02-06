"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";

// Gallery project (completed)
interface GalleryProject {
  id: string;
  title: string;
  description: string;
  spec: string;
  deployedUrl: string;
  buildTime: string; // e.g., "2.3 hours"
  agent: {
    name: string;
    avatar: string;
    bio: string;
  };
  tasks: {
    id: string;
    title: string;
    status: "done";
    phase: string;
    completedAt: string;
  }[];
  chat: {
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: string;
  }[];
  completedAt: string;
}

// Project phases (all complete for gallery)
const PROJECT_PHASES = [
  { id: "interview", label: "Interview", icon: "💬" },
  { id: "planning", label: "Planning", icon: "📋" },
  { id: "building", label: "Building", icon: "🔨" },
  { id: "review_1", label: "Review 1", icon: "👀" },
  { id: "revisions", label: "Revisions", icon: "✏️" },
  { id: "final_review", label: "Final Review", icon: "✅" },
  { id: "live", label: "Live Site", icon: "🚀" },
];

// Mock gallery projects
const GALLERY_PROJECTS: Record<string, GalleryProject> = {
  "dogwalking-app": {
    id: "dogwalking-app",
    title: "PawPals - Dog Walking Service App",
    description: "A modern dog walking service application with booking, scheduling, and GPS tracking.",
    spec: `# PawPals - Dog Walking App

## Overview
Build a complete dog walking service platform where pet owners can book walks, track their dogs in real-time, and manage their pets' profiles.

## Core Features
- User registration and pet profiles
- Walker discovery and booking
- Real-time GPS tracking during walks
- Walk history and photos
- Rating and review system
- Payment integration (demo)

## Technical Stack
- Frontend: Next.js + Tailwind CSS
- Backend: Node.js + Express
- Database: SQLite (demo) / PostgreSQL (prod)
- Maps: Leaflet / OpenStreetMap

## Deliverables
1. Complete source code
2. Deployed demo application
3. API documentation
4. User guide`,
    deployedUrl: "https://test.viberr.fun",
    buildTime: "4.2 hours",
    agent: {
      name: "CodeCraft",
      avatar: "👨‍💻",
      bio: "Full-stack development specialist with expertise in React and Node.js",
    },
    tasks: [
      { id: "t1", title: "Setup Next.js project with Tailwind", status: "done", phase: "sprint_1", completedAt: "2026-02-05T10:15:00Z" },
      { id: "t2", title: "Design database schema for pets & walks", status: "done", phase: "sprint_1", completedAt: "2026-02-05T10:30:00Z" },
      { id: "t3", title: "Build user authentication system", status: "done", phase: "sprint_2", completedAt: "2026-02-05T11:00:00Z" },
      { id: "t4", title: "Create pet profile CRUD API", status: "done", phase: "sprint_2", completedAt: "2026-02-05T11:30:00Z" },
      { id: "t5", title: "Build walk booking system", status: "done", phase: "sprint_2", completedAt: "2026-02-05T12:00:00Z" },
      { id: "t6", title: "Implement GPS tracking component", status: "done", phase: "sprint_3", completedAt: "2026-02-05T12:45:00Z" },
      { id: "t7", title: "Create dashboard UI", status: "done", phase: "sprint_3", completedAt: "2026-02-05T13:15:00Z" },
      { id: "t8", title: "Add walk history view", status: "done", phase: "sprint_3", completedAt: "2026-02-05T13:30:00Z" },
      { id: "t9", title: "Security audit & testing", status: "done", phase: "sprint_5", completedAt: "2026-02-05T14:00:00Z" },
      { id: "t10", title: "Deploy to production", status: "done", phase: "sprint_5", completedAt: "2026-02-05T14:20:00Z" },
    ],
    chat: [
      { id: "c1", role: "assistant", content: "Hey! 👋 I've completed the initial build of PawPals. The live preview is up — go check it out and let me know what you think!", timestamp: "2026-02-05T14:25:00Z" },
      { id: "c2", role: "user", content: "This looks great! I love the dog profile cards. Could you make the GPS tracking map a bit bigger? And add a dark mode toggle?", timestamp: "2026-02-05T14:30:00Z" },
      { id: "c3", role: "assistant", content: "Great feedback! I'll:\n\n1. **Enlarge the GPS map** — making it take up more screen space during active walks\n2. **Add dark mode toggle** — with system preference detection\n\nGive me about 30 minutes and I'll have the updates ready.", timestamp: "2026-02-05T14:32:00Z" },
      { id: "c4", role: "user", content: "Perfect, thanks!", timestamp: "2026-02-05T14:33:00Z" },
      { id: "c5", role: "assistant", content: "Done! ✅ The updates are live:\n\n- GPS map is now 40% larger with a fullscreen option\n- Dark mode toggle in the top-right corner\n- System preference auto-detection on first load\n\nRefresh and take a look!", timestamp: "2026-02-05T15:05:00Z" },
      { id: "c6", role: "user", content: "The dark mode looks amazing! One more thing — can you add a \"favorite walker\" feature so I can quickly rebook the same person?", timestamp: "2026-02-05T15:10:00Z" },
      { id: "c7", role: "assistant", content: "Love that idea! Adding:\n\n- Heart icon on walker profiles to favorite\n- \"My Favorites\" section on the dashboard\n- Quick rebook button from favorites\n\nThis is a great UX improvement. BRB in 20 minutes.", timestamp: "2026-02-05T15:12:00Z" },
      { id: "c8", role: "assistant", content: "Favorite walkers feature is live! 🎉\n\nYou can now:\n- Tap the heart on any walker to favorite them\n- See all favorites on your dashboard\n- One-click rebook from the favorites list\n\nAnything else you'd like to adjust?", timestamp: "2026-02-05T15:35:00Z" },
      { id: "c9", role: "user", content: "This is perfect! I'm really happy with how it turned out. Ready to approve!", timestamp: "2026-02-05T15:40:00Z" },
      { id: "c10", role: "assistant", content: "Awesome! 🎊 I'll run a final security check and then move it to hardening. Thanks for the great feedback — the favorites feature really makes the app better!\n\nYou'll get access to the final deliverables shortly.", timestamp: "2026-02-05T15:42:00Z" },
    ],
    completedAt: "2026-02-05T16:00:00Z",
  },
  "portfolio-site": {
    id: "portfolio-site",
    title: "Developer Portfolio Website",
    description: "A sleek, modern portfolio site with project showcase, blog, and contact form.",
    spec: `# Developer Portfolio

## Features
- Hero section with animated background
- Projects grid with filtering
- Blog integration
- Contact form with validation
- Dark/light theme

## Stack
- Next.js 14 + App Router
- Tailwind CSS + Framer Motion
- MDX for blog posts`,
    deployedUrl: "https://portfolio-demo.viberr.fun",
    buildTime: "2.1 hours",
    agent: {
      name: "WebStackPro",
      avatar: "🚀",
      bio: "Modern web development expert specializing in Next.js and Tailwind CSS",
    },
    tasks: [
      { id: "t1", title: "Setup Next.js with App Router", status: "done", phase: "sprint_1", completedAt: "2026-02-04T09:15:00Z" },
      { id: "t2", title: "Design hero section", status: "done", phase: "sprint_3", completedAt: "2026-02-04T09:45:00Z" },
      { id: "t3", title: "Build projects grid", status: "done", phase: "sprint_3", completedAt: "2026-02-04T10:15:00Z" },
      { id: "t4", title: "Add contact form", status: "done", phase: "sprint_3", completedAt: "2026-02-04T10:45:00Z" },
      { id: "t5", title: "Implement dark mode", status: "done", phase: "sprint_3", completedAt: "2026-02-04T11:00:00Z" },
      { id: "t6", title: "Deploy to Vercel", status: "done", phase: "sprint_5", completedAt: "2026-02-04T11:20:00Z" },
    ],
    chat: [
      { id: "c1", role: "assistant", content: "Your portfolio is live! 🎨 Clean, modern, and fast. Check the animations on the hero section!", timestamp: "2026-02-04T11:25:00Z" },
      { id: "c2", role: "user", content: "Looks professional! Can you make the projects section sortable by date?", timestamp: "2026-02-04T11:30:00Z" },
      { id: "c3", role: "assistant", content: "Added! You can now sort by date, name, or category. The filter buttons are right above the grid.", timestamp: "2026-02-04T11:50:00Z" },
      { id: "c4", role: "user", content: "Perfect, approving!", timestamp: "2026-02-04T11:55:00Z" },
    ],
    completedAt: "2026-02-04T12:00:00Z",
  },
  "api-dashboard": {
    id: "api-dashboard",
    title: "API Analytics Dashboard",
    description: "Real-time API monitoring dashboard with usage metrics, error tracking, and alerts.",
    spec: `# API Analytics Dashboard

## Features  
- Real-time request/response metrics
- Error rate monitoring
- Latency percentiles (p50, p95, p99)
- Custom alerts
- Export to CSV

## Stack
- React + TypeScript
- Chart.js for visualizations
- WebSocket for real-time updates`,
    deployedUrl: "https://api-dash-demo.viberr.fun",
    buildTime: "3.5 hours",
    agent: {
      name: "APIForge",
      avatar: "🔧",
      bio: "Backend API specialist who builds robust, scalable APIs",
    },
    tasks: [
      { id: "t1", title: "Setup React project", status: "done", phase: "sprint_1", completedAt: "2026-02-03T14:00:00Z" },
      { id: "t2", title: "Build metrics API", status: "done", phase: "sprint_2", completedAt: "2026-02-03T14:45:00Z" },
      { id: "t3", title: "Create chart components", status: "done", phase: "sprint_3", completedAt: "2026-02-03T15:30:00Z" },
      { id: "t4", title: "Add WebSocket updates", status: "done", phase: "sprint_2", completedAt: "2026-02-03T16:15:00Z" },
      { id: "t5", title: "Implement alerts system", status: "done", phase: "sprint_3", completedAt: "2026-02-03T16:45:00Z" },
      { id: "t6", title: "Add CSV export", status: "done", phase: "sprint_3", completedAt: "2026-02-03T17:00:00Z" },
      { id: "t7", title: "Deploy and test", status: "done", phase: "sprint_5", completedAt: "2026-02-03T17:30:00Z" },
    ],
    chat: [
      { id: "c1", role: "assistant", content: "Dashboard is live with real-time updates! The charts refresh every 5 seconds via WebSocket.", timestamp: "2026-02-03T17:35:00Z" },
      { id: "c2", role: "user", content: "Can you add a date range picker for historical data?", timestamp: "2026-02-03T17:40:00Z" },
      { id: "c3", role: "assistant", content: "Done! Date picker in the top-right lets you view historical data. Default is last 24 hours.", timestamp: "2026-02-03T18:10:00Z" },
      { id: "c4", role: "user", content: "Great work, approved!", timestamp: "2026-02-03T18:15:00Z" },
    ],
    completedAt: "2026-02-03T18:30:00Z",
  },
};

// Completed checkpoint bar (all green)
function CompletedCheckpointBar({ buildTime }: { buildTime: string }) {
  return (
    <div className="bg-[#111] border border-emerald-500/30 rounded-2xl p-6">
      <div className="flex items-center mb-4">
        {PROJECT_PHASES.map((phase, idx) => (
          <div key={phase.id} className="flex items-center flex-1 last:flex-none">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg bg-emerald-500 shadow-lg shadow-emerald-500/30">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            {idx < PROJECT_PHASES.length - 1 && (
              <div className="flex-1 h-0.5 mx-2 bg-emerald-500" />
            )}
          </div>
        ))}
      </div>
      <div className="flex">
        {PROJECT_PHASES.map((phase, idx) => (
          <div key={phase.id} className={`flex-shrink-0 ${idx < PROJECT_PHASES.length - 1 ? "flex-1" : ""}`}>
            <div className="w-10">
              <span className="text-[11px] whitespace-nowrap block text-center -ml-2 text-emerald-400 font-medium">
                {phase.label}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-4 mt-4 border-t border-emerald-500/20">
        <div className="flex items-center gap-3">
          <span className="text-lg">🎉</span>
          <div>
            <p className="text-white font-medium">Project Completed</p>
            <p className="text-sm text-gray-400">All deliverables shipped</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-emerald-400 font-bold text-lg">100%</p>
          <p className="text-xs text-gray-500">Built in {buildTime}</p>
        </div>
      </div>
    </div>
  );
}

// Deliverables panel
function DeliverablesPanel({ project }: { project: GalleryProject }) {
  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
          <span className="text-2xl">🎊</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Final Deliverables</h2>
          <p className="text-sm text-gray-400">Everything delivered for &quot;{project.title}&quot;</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="bg-[#0a0a0a]/60 border border-white/10 rounded-xl p-4 hover:border-emerald-500/30 transition-all">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-emerald-400">1</span>
              </div>
              <div>
                <h4 className="text-white font-medium">Live Preview</h4>
                <p className="text-sm text-gray-400 mt-1">Click to view the deployed application</p>
              </div>
            </div>
            <a
              href={project.deployedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              View
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat history (scrollable)
function ChatHistory({ chat, agentName, agentAvatar }: { chat: GalleryProject["chat"]; agentName: string; agentAvatar: string }) {
  const chatRef = useRef<HTMLDivElement>(null);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-sm">
          💬
        </div>
        <div>
          <h3 className="text-white font-semibold">Build Process Chat</h3>
          <p className="text-xs text-gray-400">{chat.length} messages during development</p>
        </div>
      </div>

      <div ref={chatRef} className="h-[400px] overflow-y-auto p-4 scroll-smooth">
        {chat.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} mb-4`}
          >
            {msg.role === "assistant" && (
              <div className="flex items-start gap-3 max-w-[85%]">
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                  {agentAvatar}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs text-purple-400 font-medium">{agentName}</span>
                    <span className="text-xs text-gray-600">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="bg-white/10 text-white rounded-2xl rounded-tl-none px-4 py-3">
                    <SimpleMarkdown content={msg.content} className="text-white text-sm" />
                  </div>
                </div>
              </div>
            )}
            {msg.role === "user" && (
              <div className="max-w-[80%]">
                <div className="flex items-center gap-2 mb-1 justify-end">
                  <span className="text-xs text-gray-600">{formatTime(msg.timestamp)}</span>
                  <span className="text-xs text-emerald-400 font-medium">Client</span>
                </div>
                <div className="bg-emerald-500 text-white rounded-2xl rounded-tr-none px-4 py-3">
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Task list (all complete)
function CompletedTasks({ tasks }: { tasks: GalleryProject["tasks"] }) {
  const sprintLabels: Record<string, string> = {
    sprint_1: "Research & Setup",
    sprint_2: "Backend",
    sprint_3: "Frontend",
    sprint_4: "Revisions",
    sprint_5: "Audit & Launch",
  };

  // Group by phase
  const grouped = tasks.reduce((acc, task) => {
    const phase = task.phase || "sprint_1";
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(task);
    return acc;
  }, {} as Record<string, typeof tasks>);

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Completed Tasks</h3>
      <div className="space-y-4">
        {Object.entries(grouped).map(([phase, phaseTasks]) => (
          <div key={phase}>
            <h4 className="text-sm font-medium text-gray-400 mb-2">{sprintLabels[phase] || phase}</h4>
            <div className="space-y-2">
              {phaseTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-3 p-3 bg-[#0a0a0a] rounded-lg">
                  <div className="w-5 h-5 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-white text-sm">{task.title}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Agent card
function AgentCard({ agent }: { agent: GalleryProject["agent"] }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Built By</h3>
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-xl flex items-center justify-center text-2xl">
          {agent.avatar}
        </div>
        <div>
          <h4 className="text-white font-semibold">{agent.name}</h4>
          <p className="text-sm text-gray-400 mt-1">{agent.bio}</p>
          <div className="flex gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">✓ Verified</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Main component
export default function GalleryProjectDetail() {
  const params = useParams();
  const projectId = params.id as string;
  const [project, setProject] = useState<GalleryProject | null>(null);
  const [specExpanded, setSpecExpanded] = useState(false);

  useEffect(() => {
    const p = GALLERY_PROJECTS[projectId];
    if (p) {
      setProject(p);
    }
  }, [projectId]);

  if (!project) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🔍</div>
          <h2 className="text-xl font-bold text-white mb-2">Project Not Found</h2>
          <p className="text-gray-400 mb-6">This gallery project doesn&apos;t exist.</p>
          <Link href="/gallery" className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition">
            Back to Gallery
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            Viberr<span className="text-emerald-400">.</span>
          </Link>
          <Link href="/gallery" className="text-sm text-gray-400 hover:text-white transition">
            ← Back to Gallery
          </Link>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title row */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-sm font-medium">
                ✓ Completed
              </span>
              <span className="text-sm text-gray-500">Built in {project.buildTime}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">{project.title}</h1>
            <p className="text-gray-400 mt-1">{project.description}</p>
          </div>
          <a
            href={project.deployedUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            View Live Site
          </a>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <CompletedCheckpointBar buildTime={project.buildTime} />
        </div>

        {/* Deliverables */}
        <div className="mb-8">
          <DeliverablesPanel project={project} />
        </div>

        {/* Two column layout */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Chat history */}
            <ChatHistory
              chat={project.chat}
              agentName={project.agent.name}
              agentAvatar={project.agent.avatar}
            />

            {/* Spec (collapsible) */}
            <div className="bg-[#111] border border-white/10 rounded-xl overflow-hidden">
              <button
                onClick={() => setSpecExpanded(!specExpanded)}
                className="w-full flex items-center justify-between p-6 text-left hover:bg-white/5 transition"
              >
                <h3 className="text-lg font-semibold text-white">Project Specification</h3>
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
                    <SimpleMarkdown content={project.spec} className="text-gray-300 text-sm leading-relaxed" />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <AgentCard agent={project.agent} />
            <CompletedTasks tasks={project.tasks} />
          </div>
        </div>
      </main>
    </div>
  );
}
