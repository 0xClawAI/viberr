"use client";
import { API_BASE_URL } from "@/lib/config";

import Link from "next/link";
import { useState, useEffect, useCallback, useRef } from "react";
import { useParams } from "next/navigation";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";
import { TipButton } from "@/components/TipButton";
import TaskEventStream from "@/components/TaskEventStream";

// Types
interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  order: number;
  phase?: string; // sprint/phase grouping
  taskType?: string; // "build" | "revision" (camelCase from backend)
  task_type?: string; // "build" | "revision" (snake_case from backend)
}

// Sprint definitions matching checkpoint phases
const SPRINTS = [
  { id: "sprint_1", label: "Research & Setup", checkpoints: ["building", "review_1"], color: "bg-blue-500", textColor: "text-blue-300", bgColor: "bg-blue-500/20" },
  { id: "sprint_2", label: "Backend", checkpoints: ["building"], color: "bg-indigo-500", textColor: "text-indigo-300", bgColor: "bg-indigo-500/20" },
  { id: "sprint_3", label: "Frontend", checkpoints: ["building", "review_1"], color: "bg-cyan-500", textColor: "text-cyan-300", bgColor: "bg-cyan-500/20" },
  { id: "sprint_4", label: "Revisions", checkpoints: ["revisions"], color: "bg-purple-500", textColor: "text-purple-300", bgColor: "bg-purple-500/20" },
  { id: "sprint_5", label: "Audit & Launch", checkpoints: ["final_review", "live"], color: "bg-emerald-500", textColor: "text-emerald-300", bgColor: "bg-emerald-500/20" },
] as const;

// Auto-assign tasks to phases based on title keywords
function assignSprint(task: Task, totalTasks: number): string {
  if (task.phase) return task.phase;
  // All revision tasks go to Revisions phase - check both snake_case and camelCase
  if (task.task_type === 'revision' || task.taskType === 'revision') return "sprint_4";
  const title = task.title.toLowerCase();
  // Audit & Launch
  if (title.includes("deploy") || title.includes("live") || title.includes("launch") || title.includes("production") || title.includes("audit") || title.includes("security") || title.includes("pentest") || title.includes("penetration")) return "sprint_5";
  // Revisions
  if (title.includes("revision") || title.includes("feedback") || title.includes("fix") || title.includes("polish") || title.includes("change request")) return "sprint_4";
  // Frontend
  if (title.includes("frontend") || title.includes("ui") || title.includes("component") || title.includes("page") || title.includes("layout") || title.includes("style") || title.includes("css") || title.includes("react") || title.includes("next")) return "sprint_3";
  // Backend
  if (title.includes("backend") || title.includes("api") || title.includes("database") || title.includes("server") || title.includes("route") || title.includes("endpoint") || title.includes("schema") || title.includes("migration") || title.includes("contract")) return "sprint_2";
  // Research & Setup (default for everything else — setup, planning, research, config)
  return "sprint_1";
}

// Deliverable can be a string (URL) or an object with title/description/link
interface Deliverable {
  title?: string;
  description?: string;
  link?: string;
  url?: string; // alternative field
}

interface ReviewMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

interface Job {
  id: string;
  title: string;
  description: string;
  spec: string;
  status: "created" | "funded" | "in_progress" | "review" | "revisions" | "final_review" | "hardening" | "completed" | "disputed";
  price: number;
  deliverables: (string | Deliverable)[];
  agent: {
    id: string;
    name: string;
    avatar: string;
  };
  client: {
    id: string;
    name: string;
  };
  tasks: Task[];
  createdAt: string;
  updatedAt: string;
}

interface ActivityItem {
  id: string;
  type: "status_change" | "task_update" | "message" | "payment" | "dispute";
  message: string;
  timestamp: string;
  actor?: string;
}

// Status badge config
const STATUS_CONFIG: Record<Job["status"], { bg: string; text: string; border: string; label: string }> = {
  created: { bg: "bg-gray-500/20", text: "text-gray-300", border: "border-gray-500/30", label: "Created" },
  funded: { bg: "bg-blue-500/20", text: "text-blue-300", border: "border-blue-500/30", label: "Funded" },
  in_progress: { bg: "bg-yellow-500/20", text: "text-yellow-300", border: "border-yellow-500/30", label: "In Progress" },
  review: { bg: "bg-purple-500/20", text: "text-purple-300", border: "border-purple-500/30", label: "Review 1" },
  revisions: { bg: "bg-orange-500/20", text: "text-orange-300", border: "border-orange-500/30", label: "Revisions" },
  final_review: { bg: "bg-indigo-500/20", text: "text-indigo-300", border: "border-indigo-500/30", label: "Final Review" },
  hardening: { bg: "bg-cyan-500/20", text: "text-cyan-300", border: "border-cyan-500/30", label: "Hardening" },
  completed: { bg: "bg-emerald-500/20", text: "text-emerald-300", border: "border-emerald-500/30", label: "Completed" },
  disputed: { bg: "bg-red-500/20", text: "text-red-300", border: "border-red-500/30", label: "Disputed" },
};

// Mock data for when backend is unavailable
const MOCK_JOB: Job = {
  id: "job-001",
  title: "E-commerce Dashboard Development",
  description: "Build a modern e-commerce admin dashboard with real-time analytics, inventory management, and order tracking.",
  deliverables: [],
  spec: `# E-commerce Dashboard Project

## Overview
Build a comprehensive admin dashboard for an e-commerce platform with real-time analytics and inventory management.

## Features
- Real-time sales analytics
- Inventory management system
- Order tracking and management
- Customer insights dashboard
- Revenue reports and charts

## Technical Requirements
- React + TypeScript frontend
- RESTful API integration
- Responsive design (mobile-first)
- Dark/light theme support

## Deliverables
1. Complete source code
2. Documentation
3. Deployment guide
4. 30-day support

## Timeline
Estimated: 7 days`,
  status: "in_progress",
  price: 299,
  agent: {
    id: "agent-1",
    name: "CodeCraft",
    avatar: "🤖",
  },
  client: {
    id: "client-1",
    name: "You",
  },
  tasks: [
    { id: "t1", title: "Setup project structure", status: "done", order: 1 },
    { id: "t2", title: "Build authentication system", status: "done", order: 2 },
    { id: "t3", title: "Create dashboard layout", status: "in_progress", order: 3 },
    { id: "t4", title: "Implement analytics charts", status: "in_progress", order: 4 },
    { id: "t5", title: "Build inventory management", status: "todo", order: 5 },
    { id: "t6", title: "Order tracking system", status: "todo", order: 6 },
    { id: "t7", title: "Testing & documentation", status: "todo", order: 7 },
  ],
  createdAt: "2026-02-01T10:00:00Z",
  updatedAt: "2026-02-04T12:00:00Z",
};

const MOCK_ACTIVITY: ActivityItem[] = [
  { id: "a1", type: "status_change", message: "Job status changed to In Progress", timestamp: "2026-02-02T10:00:00Z", actor: "CodeCraft" },
  { id: "a2", type: "task_update", message: "Task 'Setup project structure' marked as done", timestamp: "2026-02-02T14:30:00Z", actor: "CodeCraft" },
  { id: "a3", type: "message", message: "Started working on the authentication system", timestamp: "2026-02-02T15:00:00Z", actor: "CodeCraft" },
  { id: "a4", type: "task_update", message: "Task 'Build authentication system' marked as done", timestamp: "2026-02-03T09:00:00Z", actor: "CodeCraft" },
  { id: "a5", type: "task_update", message: "Task 'Create dashboard layout' started", timestamp: "2026-02-03T10:00:00Z", actor: "CodeCraft" },
  { id: "a6", type: "message", message: "Dashboard layout is 70% complete. Will start analytics charts soon.", timestamp: "2026-02-04T11:00:00Z", actor: "CodeCraft" },
];

// Status Badge Component
function StatusBadge({ status }: { status: Job["status"] }) {
  const config = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium ${config.bg} ${config.text} border ${config.border}`}>
      {status === "in_progress" && <span className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />}
      {status === "review" && <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />}
      {status === "revisions" && <span className="w-2 h-2 bg-orange-400 rounded-full animate-pulse" />}
      {status === "final_review" && <span className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse" />}
      {status === "hardening" && <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />}
      {status === "completed" && <span className="w-2 h-2 bg-emerald-400 rounded-full" />}
      {config.label}
    </span>
  );
}

// Progress Bar Component
// Project checkpoint phases
const PROJECT_PHASES = [
  { id: "interview", label: "Interview", icon: "💬", description: "Requirements gathered" },
  { id: "planning", label: "Planning", icon: "📋", description: "PRD & tasks created" },
  { id: "building", label: "Building", icon: "🔨", description: "Development in progress" },
  { id: "review_1", label: "Review 1", icon: "👀", description: "First draft review" },
  { id: "revisions", label: "Revisions", icon: "✏️", description: "Applying feedback" },
  { id: "final_review", label: "Final Review", icon: "✅", description: "Final approval" },
  { id: "live", label: "Live Site", icon: "🚀", description: "Deployed & delivered" },
];

function getActivePhase(status: string, tasks: Task[]): string {
  // ===== FIX BUG-004: Always trust DB status over computed values =====
  // Check ALL explicit statuses first, BEFORE doing any task-based computation
  
  // Terminal/explicit statuses — these should NEVER be overridden by task counts
  if (status === "completed") return "live";
  if (status === "hardening") return "live"; // hardening is the step before live
  if (status === "final_review") return "final_review";
  if (status === "revisions") return "revisions";
  if (status === "review") return "review_1";
  if (status === "disputed") return "revisions";
  if (status === "funded" || status === "created") return "interview";
  
  // Only compute phase from tasks if status is ambiguous (in_progress)
  if (status === "in_progress") {
    const doneTasks = tasks.filter(t => t.status === "done").length;
    const totalTasks = tasks.length;
    const inProgressTasks = tasks.filter(t => t.status === "in_progress").length;
    
    if (totalTasks === 0) return "planning";
    if (doneTasks === 0 && inProgressTasks === 0) return "planning";
    if (doneTasks > 0 && doneTasks < totalTasks) return "building";
    if (doneTasks === totalTasks) return "review_1";
    return "building";
  }
  
  // Default fallback
  return "planning";
}

function CheckpointBar({ status, tasks }: { status: string; tasks: Task[] }) {
  const activePhase = getActivePhase(status, tasks);
  const activeIdx = PROJECT_PHASES.findIndex(p => p.id === activePhase);
  
  // Task stats for the building phase
  const total = tasks.length;
  const done = tasks.filter(t => t.status === "done").length;
  const percentage = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6">
      {/* Phase checkpoints */}
      <div className="mb-4">
        {/* Circles + connector lines row */}
        <div className="flex items-center">
          {PROJECT_PHASES.map((phase, idx) => {
            const isComplete = idx < activeIdx;
            const isActive = idx === activeIdx;
            const isFuture = idx > activeIdx;

            return (
              <div key={phase.id} className="flex items-center flex-1 last:flex-none">
                {/* Circle */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-lg transition-all duration-300 flex-shrink-0 ${
                    isComplete
                      ? "bg-emerald-500 shadow-lg shadow-emerald-500/30"
                      : isActive
                      ? "bg-emerald-500/20 border-2 border-emerald-500 shadow-lg shadow-emerald-500/20"
                      : "bg-white/5 border border-white/10"
                  }`}
                >
                  {isComplete ? (
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className={isFuture ? "opacity-30" : ""}>{phase.icon}</span>
                  )}
                </div>
                {/* Connector line */}
                {idx < PROJECT_PHASES.length - 1 && (
                  <div
                    className={`flex-1 h-0.5 mx-2 transition-colors duration-500 ${
                      idx < activeIdx ? "bg-emerald-500" : "bg-white/10"
                    }`}
                  />
                )}
              </div>
            );
          })}
        </div>
        {/* Labels row — mirrors circle row layout */}
        <div className="flex mt-1.5">
          {PROJECT_PHASES.map((phase, idx) => {
            const isComplete = idx < activeIdx;
            const isActive = idx === activeIdx;
            return (
              <div key={phase.id} className={`flex-shrink-0 ${idx < PROJECT_PHASES.length - 1 ? "flex-1" : ""}`}>
                <div className="w-10">
                  <span
                    className={`text-[11px] whitespace-nowrap block text-center -ml-2 ${
                      isComplete
                        ? "text-emerald-400 font-medium"
                        : isActive
                        ? "text-white font-semibold"
                        : "text-gray-600"
                    }`}
                  >
                    {phase.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Current phase info + progress */}
      <div className="flex items-center justify-between pt-3 border-t border-white/10">
        <div className="flex items-center gap-3">
          <span className="text-lg">{PROJECT_PHASES[activeIdx]?.icon}</span>
          <div>
            <p className="text-white font-medium">{PROJECT_PHASES[activeIdx]?.label}</p>
            <p className="text-sm text-gray-400">{PROJECT_PHASES[activeIdx]?.description}</p>
          </div>
        </div>
        {total > 0 && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-emerald-400 font-bold text-lg">{percentage}%</p>
              <p className="text-xs text-gray-500">{done}/{total} tasks</p>
            </div>
            <div className="w-24 h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${percentage}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Collapsible Spec Section
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
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
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

// Kanban Task Card
function TaskCard({ task }: { task: Task }) {
  return (
    <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 hover:border-emerald-500/30 transition cursor-pointer shadow-sm">
      <p className="text-white text-sm font-medium leading-snug">{task.title}</p>
      {task.description && (
        <p className="text-gray-500 text-xs mt-2 line-clamp-2 leading-relaxed">{task.description}</p>
      )}
    </div>
  );
}

// Kanban Column
function KanbanColumn({
  title,
  tasks,
  icon,
  accentColor,
}: {
  title: string;
  tasks: Task[];
  icon: string;
  accentColor: string;
}) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl flex flex-col min-w-[280px]" style={{ minHeight: "200px", maxHeight: "500px" }}>
      {/* Sticky header */}
      <div className="sticky top-0 bg-[#111] rounded-t-xl flex items-center gap-3 p-5 pb-3 flex-shrink-0 border-b border-white/5 z-10">
        <span className="text-lg">{icon}</span>
        <h3 className="font-semibold text-white">{title}</h3>
        <span className={`ml-auto text-xs px-2.5 py-1 rounded-full ${accentColor}`}>
          {tasks.length}
        </span>
      </div>
      {/* Scrollable content */}
      <div className="space-y-3 overflow-y-auto flex-1 p-5 pt-3" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
        {tasks.length > 0 ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} />)
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">No tasks</div>
        )}
      </div>
    </div>
  );
}

// Kanban Board with Sprint Tabs
function KanbanBoard({ tasks }: { tasks: Task[] }) {
  const [activeSprint, setActiveSprint] = useState<string>("all");

  // Assign sprints to tasks
  const tasksWithSprints = tasks.map(t => ({ ...t, phase: assignSprint(t, tasks.length) }));

  // Filter by active sprint
  const filtered = activeSprint === "all" ? tasksWithSprints : tasksWithSprints.filter(t => t.phase === activeSprint);

  const todoTasks = filtered.filter((t) => t.status === "todo").sort((a, b) => a.order - b.order);
  const inProgressTasks = filtered.filter((t) => t.status === "in_progress").sort((a, b) => a.order - b.order);
  const doneTasks = filtered.filter((t) => t.status === "done").sort((a, b) => a.order - b.order);

  return (
    <div>
      {/* Phase Tabs */}
      <div className="flex items-center gap-2 mb-3 overflow-x-auto">
        <button
          onClick={() => setActiveSprint("all")}
          className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
            activeSprint === "all"
              ? "bg-white/20 text-white"
              : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
          }`}
        >
          All
          <span className="text-xs bg-white/10 px-1.5 py-0.5 rounded-full">
            {tasks.length}
          </span>
        </button>
        {SPRINTS.map(sprint => {
          const sprintTasks = tasksWithSprints.filter(t => t.phase === sprint.id);
          const sprintDone = sprintTasks.filter(t => t.status === "done").length;
          if (sprintTasks.length === 0) return null;

          return (
            <button
              key={sprint.id}
              onClick={() => setActiveSprint(sprint.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${
                activeSprint === sprint.id
                  ? `${sprint.bgColor} ${sprint.textColor} ring-1 ring-current`
                  : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${sprint.color} ${sprintDone === sprintTasks.length ? "opacity-100" : "opacity-60"}`} />
              {sprint.label}
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${sprintDone === sprintTasks.length ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10"}`}>
                {sprintDone}/{sprintTasks.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kanban Columns - horizontal scroll on mobile, grid on desktop */}
      <div className="flex md:grid md:grid-cols-3 gap-6 overflow-x-auto pb-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.15) transparent" }}>
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
  );
}

// Activity Item Component
function ActivityItemCard({ item }: { item: ActivityItem }) {
  const icons: Record<ActivityItem["type"], string> = {
    status_change: "🔄",
    task_update: "✓",
    message: "💬",
    payment: "💰",
    dispute: "⚠️",
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="flex items-start gap-3 py-3 border-b border-white/5 last:border-0">
      <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-sm flex-shrink-0">
        {icons[item.type]}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-gray-300 text-sm">{item.message}</p>
        <div className="flex items-center gap-2 mt-1">
          {item.actor && (
            <span className="text-emerald-400 text-xs font-medium">{item.actor}</span>
          )}
          <span className="text-gray-500 text-xs">{formatTime(item.timestamp)}</span>
        </div>
      </div>
    </div>
  );
}

// Activity Feed Component
function ActivityFeed({ activities }: { activities: ActivityItem[] }) {
  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Activity Feed</h3>
      <div className="max-h-[400px] overflow-y-auto">
        {activities.length > 0 ? (
          activities.map((item) => <ActivityItemCard key={item.id} item={item} />)
        ) : (
          <div className="text-center py-8 text-gray-500">No activity yet</div>
        )}
      </div>
    </div>
  );
}

// ============== DELIVERABLES PANEL ==============
function DeliverablesPanel({ deliverables, jobTitle, jobStatus = "review" }: { deliverables: (string | Deliverable)[]; jobTitle: string; jobStatus?: string }) {
  // Normalize deliverables — only show customer-facing items (URLs), hide internal paths
  const normalizedDeliverables = deliverables.map((d, idx) => {
    if (typeof d === "string") {
      const isUrl = d.startsWith("http://") || d.startsWith("https://");
      const isPath = d.startsWith("~/") || d.startsWith("/");
      // Skip internal file paths — customers don't need to see these
      if (isPath) return null;
      return {
        title: isUrl ? `Live Preview` : `Deliverable ${idx + 1}`,
        description: isUrl ? "Click to view the deployed build" : d,
        link: isUrl ? d : undefined,
      };
    }
    return {
      title: d.title || `Deliverable ${idx + 1}`,
      description: d.description || "",
      link: d.link || d.url,
    };
  }).filter(Boolean) as { title: string; description: string; link?: string }[];

  // Deduplicate by link URL — keep first occurrence, skip duplicates
  const seen = new Set<string>();
  const deduped = normalizedDeliverables.filter(d => {
    if (d.link) {
      if (seen.has(d.link)) return false;
      seen.add(d.link);
    }
    return true;
  });
  const finalDeliverables = deduped;

  return (
    <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
          <span className="text-2xl">{jobStatus === "completed" ? "🎊" : jobStatus === "hardening" ? "🛡️" : "🎉"}</span>
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">
            {jobStatus === "completed" ? "Final Deliverables" :
             jobStatus === "hardening" ? "Your Approved Build" :
             jobStatus === "final_review" ? "Updated Build Ready for Review" :
             "Your Build is Ready for Review"}
          </h2>
          <p className="text-sm text-gray-400">
            {jobStatus === "completed" ? `Everything delivered for "${jobTitle}"` :
             jobStatus === "hardening" ? `Security hardening in progress for "${jobTitle}"` :
             `Review what was built for "${jobTitle}"`}
          </p>
        </div>
      </div>

      {/* Deliverables list */}
      {finalDeliverables.length > 0 ? (
        <div className="space-y-3 mb-5">
          {finalDeliverables.map((d, idx) => (
            <div
              key={idx}
              className="bg-[#0a0a0a]/60 border border-white/10 rounded-xl p-4 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 bg-emerald-500/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-sm font-bold text-emerald-400">{idx + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-medium">{d.title}</h4>
                    {d.description && (
                      <p className="text-sm text-gray-400 mt-1">{d.description}</p>
                    )}
                  </div>
                </div>
                {d.link && (
                  <a
                    href={d.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 rounded-lg text-sm font-medium transition flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                    View
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#0a0a0a]/60 border border-white/10 rounded-xl p-6 text-center mb-5">
          <p className="text-gray-400">Deliverables information will appear here</p>
        </div>
      )}

      {/* Recap — only show chat instruction for review statuses */}
      {(jobStatus === "review" || jobStatus === "final_review") && (
        <div className="bg-[#0a0a0a]/40 rounded-xl p-4 border border-white/5">
          <p className="text-sm text-gray-300">
            💡 <strong>What to do next:</strong> Use the review chat below to discuss the build with your AI reviewer. 
            They&apos;ll help you identify anything you&apos;d like changed. When you&apos;re satisfied, click &quot;Submit Feedback&quot; to finalize.
          </p>
        </div>
      )}
    </div>
  );
}

// ============== REVIEW CHAT COMPONENT ==============
function ReviewChat({ jobId, agentName, agentAvatar, jobStatus = "review" }: { jobId: string; agentName: string; agentAvatar: string; jobStatus?: string }) {
  const [messages, setMessages] = useState<ReviewMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"approved" | "revisions" | null>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Fetch existing messages, auto-greet if empty
  useEffect(() => {
    async function loadMessages() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/review-messages`);
        if (res.ok) {
          const data = await res.json();
          const loaded = data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
            createdAt: m.createdAt,
          }));
          if (loaded.length > 0) {
            setMessages(loaded);
          } else {
            // No messages yet — show greeting
            const greeting = {
              id: `greeting-${Date.now()}`,
              role: "assistant" as const,
              content: `Hey! 👋 Your initial build is ready — the live preview link is up above, go check it out!\n\nTake your time clicking through it and testing everything. When you're ready, drop all your feedback here in one message — anything you don't like, want changed, or think is missing. The more detail the better!\n\nI'll turn your notes into a revision plan and get right on it.`,
              createdAt: new Date().toISOString(),
            };
            setMessages([greeting]);
          }
        }
      } catch {
        console.log("Could not load existing review messages");
      }
    }
    loadMessages();
  }, [jobId]);

  // Connect SSE
  useEffect(() => {
    const eventSource = new EventSource(`${API_BASE_URL}/api/jobs/${jobId}/review-stream`);
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          setIsConnected(true);
        } else if (data.type === "assistant_message") {
          setIsTyping(false);
          setMessages((prev) => {
            // Avoid duplicates
            if (prev.some((m) => m.id === data.messageId)) return prev;
            return [
              ...prev,
              {
                id: data.messageId || `a-${Date.now()}`,
                role: "assistant" as const,
                content: data.message,
                createdAt: data.timestamp || new Date().toISOString(),
              },
            ];
          });
        } else if (data.type === "feedback_submitted") {
          setFeedbackSubmitted(true);
        }
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = () => {
      setIsConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, [jobId]);

  // Send message
  const handleSend = async () => {
    if (!inputValue.trim() || isTyping) return;

    const msg = inputValue.trim();
    setInputValue("");
    setIsTyping(true);

    // Optimistically add user message
    const tempId = `user-${Date.now()}`;
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        role: "user" as const,
        content: msg,
        createdAt: new Date().toISOString(),
      },
    ]);

    try {
      await fetch(`${API_BASE_URL}/api/jobs/${jobId}/review-messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: msg }),
      });
      // Response will come via SSE
    } catch {
      setIsTyping(false);
    }

    // Focus input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Submit feedback — with confirmation gate
  const requestSubmitFeedback = (type: "approved" | "revisions") => {
    setConfirmAction(type);
  };

  const handleSubmitFeedback = async () => {
    if (!confirmAction) return;
    setSubmitting(true);
    setConfirmAction(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/submit-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ feedback: confirmAction }),
      });
      if (res.ok) {
        setFeedbackSubmitted(true);
      }
    } catch {
      alert("Failed to submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Undo feedback submission
  const handleUndoFeedback = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/undo-feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setFeedbackSubmitted(false);
        setMessages([]);
        // Reload to get fresh state
        window.location.reload();
      } else {
        const data = await res.json();
        alert(data.error || "Could not undo. The window may have expired.");
      }
    } catch {
      alert("Failed to undo. Please try again.");
    }
  };

  if (feedbackSubmitted) {
    return (
      <div className="bg-[#111] border border-emerald-500/30 rounded-2xl p-8 text-center">
        <div className="text-4xl mb-4">✅</div>
        <h3 className="text-xl font-bold text-white mb-2">Feedback Submitted!</h3>
        <p className="text-gray-400">Your feedback has been recorded. The agent will start on your changes shortly.</p>
        <div className="flex gap-3 justify-center mt-4">
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-medium transition"
          >
            Refresh Page
          </button>
          <button
            onClick={handleUndoFeedback}
            className="px-6 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white rounded-lg font-medium transition border border-white/10"
            title="Go back to the review chat (available for 5 minutes)"
          >
            ↩ Undo
          </button>
        </div>
        <p className="text-xs text-gray-600 mt-2">Changed your mind? Undo is available for 5 minutes.</p>
      </div>
    );
  }

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-sm">
            🔍
          </div>
          <div>
            <h3 className="text-white font-semibold">Review Chat</h3>
            <p className="text-xs text-gray-400">
              {isConnected ? (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                  Connected
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse" />
                  Connecting...
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={chatContainerRef}
        className="h-[400px] overflow-y-auto p-4 scroll-smooth"
      >
        {messages.length === 0 && !isTyping ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="text-3xl mb-3">💬</div>
              <p className="text-gray-400 text-sm">Start chatting about the build!</p>
              <p className="text-gray-500 text-xs mt-1">Ask questions or share feedback about the deliverables</p>
            </div>
          </div>
        ) : (
          <>
            {messages.map((msg) => (
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
                      <span className="text-xs text-purple-400 font-medium mb-1 block">{agentName}</span>
                      <div className="bg-white/10 text-white rounded-2xl rounded-tl-none px-4 py-3">
                        <SimpleMarkdown content={msg.content} className="text-white text-sm" />
                      </div>
                    </div>
                  </div>
                )}
                {msg.role === "user" && (
                  <div className="max-w-[80%]">
                    <div className="bg-emerald-500 text-white rounded-2xl rounded-tr-none px-4 py-3">
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="flex items-start gap-3 max-w-[85%]">
                  <div className="w-8 h-8 bg-gradient-to-br from-purple-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                    {agentAvatar}
                  </div>
                  <div>
                    <span className="text-xs text-purple-400 font-medium mb-1 block">{agentName}</span>
                    <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.6s" }} />
                          <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.6s" }} />
                        </div>
                        <span className="text-sm text-gray-400 ml-2">reviewing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Input area */}
      <div className="border-t border-white/10 p-4">
        <div className="flex gap-3 mb-3">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Share your feedback or ask questions..."
            className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all text-sm"
            rows={2}
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="px-5 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all text-sm self-end"
          >
            Send
          </button>
        </div>

        {/* Action buttons — context-aware per review stage */}
        <div className="flex gap-3">
          {jobStatus === "review" ? (
            /* Review 1: Only "Request Revisions" — customer shares feedback then submits */
            <button
              onClick={() => requestSubmitFeedback("revisions")}
              disabled={submitting || messages.filter(m => m.role === "user").length === 0}
              title={messages.filter(m => m.role === "user").length === 0 ? "Share your feedback in the chat first" : "Submit your revision requests to the agent"}
              className="flex-1 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? "⏳ Submitting..." : "✏️ Submit Revision Requests"}
            </button>
          ) : (
            /* Final Review: "Request Revisions" OR "Approve Build" — mutually exclusive based on feedback */
            (() => {
              const hasUserMessages = messages.filter(m => m.role === "user").length > 0;
              return (
                <>
                  <button
                    onClick={() => requestSubmitFeedback("revisions")}
                    disabled={submitting || !hasUserMessages}
                    title={!hasUserMessages ? "Share your feedback first" : "Request more changes"}
                    className="flex-1 py-2.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 border border-amber-500/30 rounded-xl font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "⏳ Submitting..." : "✏️ Request Revisions"}
                  </button>
                  <button
                    onClick={() => requestSubmitFeedback("approved")}
                    disabled={submitting || hasUserMessages}
                    title={hasUserMessages ? "You have revision feedback — submit revisions first or clear the chat" : "Approve the build and move to final hardening & delivery"}
                    className="flex-1 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-xl font-medium transition text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? "⏳ Submitting..." : "✅ Approve Build"}
                  </button>
                </>
              );
            })()
          )}
        </div>

        {/* Confirmation Modal */}
        {confirmAction && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setConfirmAction(null)}>
            <div className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 max-w-md mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="text-center mb-4">
                <span className="text-3xl">{confirmAction === "revisions" ? "✏️" : "✅"}</span>
              </div>
              <h3 className="text-lg font-bold text-white text-center mb-2">
                {confirmAction === "revisions" ? "Submit Revision Requests?" : "Approve This Build?"}
              </h3>
              <p className="text-sm text-gray-400 text-center mb-6">
                {confirmAction === "revisions"
                  ? "Your feedback from the chat will be sent to the agent. They'll start working on your changes right away."
                  : "This will approve the build and move to the final hardening & security phase."}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl font-medium transition text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitFeedback}
                  disabled={submitting}
                  className={`flex-1 py-2.5 rounded-xl font-medium transition text-sm ${
                    confirmAction === "revisions"
                      ? "bg-amber-500 hover:bg-amber-600 text-white"
                      : "bg-emerald-500 hover:bg-emerald-600 text-white"
                  }`}
                >
                  {submitting ? "Submitting..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Action Buttons Component — context-aware per status
function ActionButtons({
  status,
  onApprove,
  onDispute,
  onRequestWork,
  isLoading,
  jobId,
  agentId,
  agentName,
  onTipSuccess,
}: {
  status: Job["status"];
  onApprove: () => void;
  onDispute: () => void;
  onRequestWork?: () => void;
  isLoading: boolean;
  jobId?: string;
  agentId?: string;
  agentName?: string;
  onTipSuccess?: () => void;
}) {
  const canRequestWork = status === "funded";
  const canDispute = ["funded", "in_progress", "review", "revisions", "final_review"].includes(status);
  // Approve & Release only shows at "live" stage (after hardening)
  const canApprove = status === "completed" || status === "hardening";

  // Status hints
  const hints: Record<string, string> = {
    created: "Waiting for payment to fund escrow.",
    funded: "Agent will start working soon.",
    in_progress: "Agent is working on your project.",
    review: "Review the build above and share your feedback in the chat.",
    revisions: "Agent is implementing your requested changes.",
    final_review: "Review the final build. Approve when you're satisfied.",
    hardening: "Security audit and bug fixes in progress.",
    completed: "Job completed! All deliverables have been delivered.",
    disputed: "Dispute is being reviewed by mediators.",
  };

  return (
    <div className="bg-[#111] border border-white/10 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Actions</h3>
      <div className="space-y-3">
        {/* Request Work Button - shows when funded */}
        {canRequestWork && onRequestWork && (
          <button
            onClick={onRequestWork}
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Request Agent to Start Work
          </button>
        )}

        {/* Approve & Release — only at live/hardening stage */}
        {canApprove && (
          <button
            onClick={onApprove}
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Approve & Release Payment
          </button>
        )}

        {/* Tip Button — shows after completion */}
        <TipButton
          jobId={jobId || ""}
          agentId={agentId || ""}
          agentName={agentName}
          jobStatus={status}
          onTipSuccess={onTipSuccess}
        />

        {/* Dispute Button */}
        {canDispute && (
          <button
            onClick={onDispute}
            disabled={isLoading}
            className="w-full py-3 rounded-xl font-medium transition flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            Open Dispute
          </button>
        )}
      </div>

      {/* Status hint */}
      <div className="mt-4 p-3 bg-white/5 rounded-lg">
        <p className="text-xs text-gray-500">
          {hints[status] || ""}
        </p>
      </div>
    </div>
  );
}

// Main Component
export default function JobDashboard() {
  const params = useParams();
  const jobId = params.id as string;

  const [job, setJob] = useState<Job | null>(null);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [specExpanded, setSpecExpanded] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<string | null>(null);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportDescription, setReportDescription] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);

  // Fetch job data
  const fetchJob = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}`);
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      // Transform API response to frontend Job format
      const raw = data.job || data;
      const agentData = data.agent || {};
      const transformed: Job = {
        id: raw.id,
        title: raw.title || "Untitled Job",
        description: raw.description || "",
        spec: raw.spec || raw.description || "",
        status: raw.status || "created",
        price: raw.priceUsdc ?? raw.price ?? 0,
        deliverables: raw.deliverables || [],
        agent: {
          id: agentData.id || raw.agentId || "",
          name: agentData.name || raw.agentName || "Agent",
          avatar: agentData.avatarUrl || agentData.avatar || "🤖",
        },
        client: {
          id: raw.clientWallet || "",
          name: raw.clientWallet === "0x0000000000000000000000000000000000000000" ? "Free Trial" : (raw.clientWallet?.slice(0, 8) + "..." || "Client"),
        },
        tasks: (data.tasks || []).map((t: Record<string, unknown>) => {
          // Map backend statuses to frontend: pending→todo, completed→done
          const rawStatus = (t.status || "pending") as string;
          const status = rawStatus === "pending" ? "todo" : rawStatus === "completed" ? "done" : rawStatus as "todo" | "in_progress" | "done";
          return {
            id: t.id as string,
            title: t.title as string,
            description: (t.description || "") as string,
            status,
            order: ((t.orderIndex ?? t.order ?? 0) as number),
            taskType: (t.taskType || t.task_type || "build") as string,
            task_type: (t.task_type || t.taskType || "build") as string,
          };
        }),
        createdAt: raw.createdAt || new Date().toISOString(),
        updatedAt: raw.updatedAt || new Date().toISOString(),
      };
      setJob(transformed);
      setLastUpdate(new Date().toISOString());
    } catch {
      // Use mock data
      console.log("Using mock data (backend unavailable)");
      setJob({ ...MOCK_JOB, id: jobId, deliverables: [] });
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  // Fetch activity
  const fetchActivity = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/activity`);
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();
      const raw = Array.isArray(data) ? data : (data.activity || data.activities || []);
      // Map API fields to frontend ActivityItem shape
      const mapped = raw.map((a: Record<string, unknown>) => ({
        id: a.id || String(Math.random()),
        type: ((a.type || (a.action === "task_updated" ? "task_update" : a.action) || "status_change") as ActivityItem["type"]),
        message: (a.message || a.details || "") as string,
        timestamp: (a.timestamp || a.createdAt || new Date().toISOString()) as string,
        actor: (a.actor || a.actorWallet || "") as string,
      }));
      setActivity(mapped);
    } catch {
      // Use mock data
      setActivity(MOCK_ACTIVITY);
    }
  }, [jobId]);

  // Poll for updates
  const pollUpdates = useCallback(async () => {
    if (!lastUpdate) return;

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/jobs/${jobId}/updates?since=${encodeURIComponent(lastUpdate)}`
      );
      if (!res.ok) throw new Error("API unavailable");
      const data = await res.json();

      if (data.updates?.length > 0 || data.hasUpdates) {
        // Refresh job data
        await fetchJob();
        await fetchActivity();
        setLastUpdate(data.serverTime || new Date().toISOString());
      }
    } catch {
      // Silently ignore polling errors
    }
  }, [jobId, lastUpdate, fetchJob, fetchActivity]);

  // Initial fetch
  useEffect(() => {
    fetchJob();
    fetchActivity();
  }, [fetchJob, fetchActivity]);

  // Polling interval
  useEffect(() => {
    const interval = setInterval(pollUpdates, 10000); // Poll every 10 seconds
    return () => clearInterval(interval);
  }, [pollUpdates]);

  // Action handlers
  const handleApprove = async () => {
    if (!job || (job.status !== "completed" && job.status !== "hardening")) return;
    setActionLoading(true);

    try {
      // Check if it's a free trial ($0 job)
      if (job.price === 0) {
        // Show success message for free trial
        alert("No payment needed — this was a free trial! 🎉");
        
        // Mark as released in the backend
        await fetch(`${API_BASE_URL}/api/jobs/${jobId}/release`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        setActivity((prev) => [
          {
            id: `a-${Date.now()}`,
            type: "payment",
            message: "Free trial completed — no payment needed",
            timestamp: new Date().toISOString(),
            actor: "You",
          },
          ...prev,
        ]);
      } else {
        // Paid job - show placeholder toast
        alert("Payment release coming soon");
        
        // Still call the backend to mark intent
        await fetch(`${API_BASE_URL}/api/jobs/${jobId}/release`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        
        setActivity((prev) => [
          {
            id: `a-${Date.now()}`,
            type: "payment",
            message: "Payment release requested",
            timestamp: new Date().toISOString(),
            actor: "You",
          },
          ...prev,
        ]);
      }
    } catch (error) {
      console.error("Failed to release payment:", error);
      if (job.price === 0) {
        alert("No payment needed — this was a free trial! 🎉 (Offline mode)");
      } else {
        alert("Payment release coming soon (Offline mode)");
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDispute = async () => {
    if (!job || !["funded", "in_progress", "review"].includes(job.status)) return;
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "disputed" }),
      });

      if (!res.ok) throw new Error("API unavailable");

      setJob((prev) => (prev ? { ...prev, status: "disputed" } : null));
      setActivity((prev) => [
        {
          id: `a-${Date.now()}`,
          type: "dispute",
          message: "Dispute opened by client",
          timestamp: new Date().toISOString(),
          actor: "You",
        },
        ...prev,
      ]);
    } catch {
      // Mock update
      setJob((prev) => (prev ? { ...prev, status: "disputed" } : null));
      alert("Dispute opened! (Mock mode)");
    } finally {
      setActionLoading(false);
    }
  };

  const handleTip = async () => {
    if (!job || job.status !== "completed") return;
    // In production, would open a tip modal
    alert("Tip feature coming soon!");
  };

  const handleReportIssue = async () => {
    if (!reportDescription.trim()) {
      alert("Please describe the issue before submitting.");
      return;
    }

    setReportSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/jobs/${jobId}/report-issue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: reportDescription.trim(),
          type: "customer_report",
        }),
      });

      if (!res.ok) throw new Error("Failed to submit report");

      // Success - show toast and close modal
      alert("Issue reported! The agent will investigate.");
      setReportModalOpen(false);
      setReportDescription("");

      // Add to activity feed
      setActivity((prev) => [
        {
          id: `a-${Date.now()}`,
          type: "message",
          message: "Issue reported by client",
          timestamp: new Date().toISOString(),
          actor: "You",
        },
        ...prev,
      ]);
    } catch (error) {
      console.error("Failed to report issue:", error);
      alert("Failed to submit report. Please try again.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleRequestWork = async () => {
    if (!job || job.status !== "funded") return;
    setActionLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/agent-hooks/request-work/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("API unavailable");

      const data = await res.json();
      
      setActivity((prev) => [
        {
          id: `a-${Date.now()}`,
          type: "status_change",
          message: "Work requested from agent - they'll start soon!",
          timestamp: new Date().toISOString(),
          actor: "You",
        },
        ...prev,
      ]);
      
      alert(`Work requested! The agent will pick this up shortly. (Request ID: ${data.workRequestId})`);
    } catch {
      alert("Work requested! Agent will be notified. (Mock mode)");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading job details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h1 className="text-2xl font-bold mb-2">Job Not Found</h1>
          <p className="text-gray-400 mb-6">The job you&apos;re looking for doesn&apos;t exist.</p>
          <Link href="/dashboard" className="text-emerald-400 hover:text-emerald-300 transition">
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Real-time task event stream */}
      {job && (
        <TaskEventStream
          jobId={job.id}
          jobStatus={job.status}
          onTaskUpdate={() => fetchJob()}
          onJobUpdate={() => { fetchJob(); fetchActivity(); }}
        />
      )}

      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center gap-2">
              <span className="text-2xl">⚡</span>
              <span className="text-xl font-bold">Viberr</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-300 hover:text-white transition">
                Dashboard
              </Link>
              <Link
                href="/marketplace"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition"
              >
                Browse Agents
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Back link */}
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition mb-6"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Dashboard
          </Link>

          {/* Job Header */}
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <h1 className="text-2xl md:text-3xl font-bold text-white">{job.title}</h1>
                  <StatusBadge status={job.status} />
                </div>
                <div className="text-gray-400 mb-4 line-clamp-4"><SimpleMarkdown content={job.description} /></div>

                {/* Agent info */}
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-lg flex items-center justify-center text-xl">
                    {job.agent.avatar}
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">Assigned Agent</p>
                    <Link
                      href={`/marketplace/agent/${job.agent.id}`}
                      className="text-white font-medium hover:text-emerald-400 transition"
                    >
                      {job.agent.name}
                    </Link>
                  </div>
                </div>
              </div>

              {/* Price */}
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center min-w-[140px]">
                <p className="text-sm text-emerald-400 mb-1">Escrow Amount</p>
                <p className="text-3xl font-bold text-white">${job.price}</p>
              </div>
            </div>
          </div>

          {/* Checkpoint Bar */}
          <div className="mb-6">
            <CheckpointBar status={job.status} tasks={job.tasks} />
          </div>

          {/* Spec Section */}
          <div className="mb-6">
            <SpecSection
              spec={job.spec}
              isExpanded={specExpanded}
              onToggle={() => setSpecExpanded(!specExpanded)}
            />
          </div>

          {/* Deliverables Panel - shown during review, final_review, hardening, completed */}
          {["review", "final_review", "hardening", "completed"].includes(job.status) && (
            <DeliverablesPanel deliverables={job.deliverables} jobTitle={job.title} jobStatus={job.status} />
          )}

          {/* === REVISIONS STATUS: Agent working on changes === */}
          {job.status === "revisions" && (
            <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 border border-orange-500/30 rounded-2xl p-6 mb-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">✏️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Revisions in Progress</h2>
                  <p className="text-sm text-gray-400">Your feedback has been submitted! The agent is working on your changes.</p>
                </div>
              </div>
              
              {/* Revision tasks list */}
              {job.tasks.filter(t => t.phase === "sprint_4" || t.title.toLowerCase().includes("revision")).length > 0 && (
                <div className="space-y-2 mt-4">
                  <h4 className="text-sm font-medium text-orange-300 mb-2">Changes being implemented:</h4>
                  {job.tasks
                    .filter(t => t.phase === "sprint_4" || t.title.toLowerCase().includes("revision") || t.title.toLowerCase().includes("feedback"))
                    .map(task => (
                      <div key={task.id} className="flex items-center gap-3 bg-[#0a0a0a]/60 border border-white/10 rounded-lg p-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                          task.status === "done" ? "bg-emerald-500/20 text-emerald-400" :
                          task.status === "in_progress" ? "bg-yellow-500/20 text-yellow-400" :
                          "bg-white/10 text-gray-500"
                        }`}>
                          {task.status === "done" ? "✓" : task.status === "in_progress" ? "⏳" : "○"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium">{task.title}</p>
                          {task.description && (
                            <p className="text-gray-500 text-xs mt-0.5 line-clamp-2">{task.description}</p>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          task.status === "done" ? "bg-emerald-500/20 text-emerald-300" :
                          task.status === "in_progress" ? "bg-yellow-500/20 text-yellow-300" :
                          "bg-white/10 text-gray-400"
                        }`}>
                          {task.status === "done" ? "Done" : task.status === "in_progress" ? "Working" : "Queued"}
                        </span>
                      </div>
                    ))
                  }
                </div>
              )}

              <div className="bg-[#0a0a0a]/40 rounded-xl p-4 border border-white/5 mt-4">
                <p className="text-sm text-gray-300">
                  🔄 <strong>What&apos;s happening:</strong> The agent is implementing all your requested changes. 
                  You&apos;ll be notified when the updated build is ready for your final review.
                </p>
              </div>
            </div>
          )}

          {/* === HARDENING STATUS: Security audit in progress === */}
          {job.status === "hardening" && (
            <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-2xl p-6 mb-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🛡️</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Security Hardening</h2>
                  <p className="text-sm text-gray-400">Your build has been approved! Running final security checks.</p>
                </div>
              </div>
              
              {/* Hardening progress steps */}
              <div className="space-y-3 mt-4">
                {[
                  { label: "Bug audit", icon: "🐛", description: "Automated + manual bug sweep" },
                  { label: "Security scan", icon: "🔒", description: "Penetration testing & vulnerability check" },
                  { label: "Performance check", icon: "⚡", description: "Load testing & optimization" },
                  { label: "Final deployment", icon: "🚀", description: "Production-ready deployment" },
                ].map((step, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-[#0a0a0a]/60 border border-white/10 rounded-lg p-3">
                    <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center text-sm flex-shrink-0">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{step.label}</p>
                      <p className="text-gray-500 text-xs">{step.description}</p>
                    </div>
                    <div className="w-5 h-5 border-2 border-cyan-500/30 rounded-full flex items-center justify-center">
                      <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-[#0a0a0a]/40 rounded-xl p-4 border border-white/5 mt-4">
                <p className="text-sm text-gray-300">
                  🛡️ <strong>Almost there!</strong> Security is our top priority. The agent is running a full audit 
                  before delivering the final build. You&apos;ll be notified when everything is production-ready.
                </p>
              </div>
            </div>
          )}

          {/* === COMPLETED STATUS: All deliverables, payment release === */}
          {job.status === "completed" && (
            <div className="bg-gradient-to-br from-emerald-500/10 to-green-500/10 border border-emerald-500/30 rounded-2xl p-6 mb-6 animate-fade-in">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">🎉</span>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Project Complete!</h2>
                  <p className="text-sm text-gray-400">Your project has been delivered. All deliverables are ready.</p>
                </div>
              </div>

              <div className="bg-[#0a0a0a]/40 rounded-xl p-4 border border-white/5 mt-4">
                <p className="text-sm text-gray-300">
                  🎊 <strong>Congratulations!</strong> Your project is live and fully delivered. 
                  Use the Actions panel to release payment. If you&apos;re happy with the work, consider leaving a tip!
                </p>
              </div>
            </div>
          )}

          {/* Review Chat - shown during review and final_review */}
          {(job.status === "review" || job.status === "final_review") && (
            <div className="mb-6">
              <ReviewChat
                jobId={job.id}
                agentName={job.agent.name}
                agentAvatar={job.agent.avatar}
                jobStatus={job.status}
              />
            </div>
          )}

          {/* Kanban Board - shown for relevant statuses */}
          {["in_progress", "review", "revisions", "final_review"].includes(job.status) && (
            <div className="mb-6 mt-4">
              <h2 className="text-lg font-semibold text-white mb-3">Task Board</h2>
              <KanbanBoard tasks={job.tasks} />
            </div>
          )}

          {/* Activity Feed and Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <ActivityFeed activities={activity} />
            </div>
            <div>
              <ActionButtons
                status={job.status}
                onApprove={handleApprove}
                onDispute={handleDispute}
                onRequestWork={handleRequestWork}
                isLoading={actionLoading}
                jobId={job.id}
                agentId={job.agent?.id}
                agentName={job.agent?.name}
                onTipSuccess={() => fetchActivity()}
              />
            </div>
          </div>

          {/* Floating Report Issue Button */}
          <button
            onClick={() => setReportModalOpen(true)}
            className="fixed bottom-8 right-8 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 z-40 backdrop-blur-sm"
            title="Report Issue"
          >
            <span className="text-2xl">🐛</span>
          </button>

          {/* Report Issue Modal */}
          {reportModalOpen && (
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-[#111] border border-white/10 rounded-2xl p-6 max-w-lg w-full shadow-2xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span>🐛</span>
                    Report Issue
                  </h3>
                  <button
                    onClick={() => {
                      setReportModalOpen(false);
                      setReportDescription("");
                    }}
                    className="text-gray-400 hover:text-white transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <p className="text-gray-400 text-sm mb-4">
                  Found a bug or something not working as expected? Let us know and the agent will investigate.
                </p>

                <textarea
                  value={reportDescription}
                  onChange={(e) => setReportDescription(e.target.value)}
                  placeholder="Describe the issue in detail..."
                  className="w-full bg-[#0a0a0a] border border-white/10 rounded-lg p-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 min-h-[120px] resize-vertical"
                  disabled={reportSubmitting}
                />

                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setReportModalOpen(false);
                      setReportDescription("");
                    }}
                    className="flex-1 py-3 rounded-xl font-medium transition bg-white/5 hover:bg-white/10 text-gray-300"
                    disabled={reportSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReportIssue}
                    disabled={reportSubmitting || !reportDescription.trim()}
                    className="flex-1 py-3 rounded-xl font-medium transition bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {reportSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
