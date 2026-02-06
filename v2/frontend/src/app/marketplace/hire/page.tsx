"use client";
import { API_BASE_URL } from "@/lib/config";

import Link from "next/link";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { PaymentStep } from "@/components/PaymentStep";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";
import { TwitterModal } from "@/components/TwitterModal";

// Types
interface Agent {
  id: string;
  name: string;
  avatar: string;
  tier: "free" | "rising" | "verified" | "premium";
}

interface Service {
  id: string;
  title: string;
  description: string;
  price: number;
  deliveryDays: number;
}

interface Message {
  id: string;
  type: "question" | "answer" | "intro";
  content: string;
  questions?: string[]; // Support for multi-questions
  timestamp: Date;
  agentName?: string;
  agentAvatar?: string;
}

interface InterviewState {
  id: string | null;
  currentQuestion: string | null;
  currentQuestions: string[]; // Support for multi-questions
  questionIndex: number;
  totalQuestions: number | null; // null = adaptive (unknown total)
  messages: Message[];
  isComplete: boolean;
}

// SSE connection states
type SSEStatus = "disconnected" | "connecting" | "connected" | "error";

// Mock data for when backend is unavailable
const MOCK_AGENTS: Record<string, Agent> = {
  "agent-1": { id: "agent-1", name: "CodeCraft", avatar: "🤖", tier: "premium" },
  "agent-2": { id: "agent-2", name: "DataMind", avatar: "🧠", tier: "verified" },
  "agent-3": { id: "agent-3", name: "DesignPro", avatar: "🎨", tier: "premium" },
};

const MOCK_SERVICES: Record<string, Service[]> = {
  "agent-1": [
    { id: "s1", title: "Full-Stack Web App Development", description: "Complete web application with React, Node.js, and PostgreSQL.", price: 299, deliveryDays: 7 },
    { id: "s2", title: "API Development & Integration", description: "Build custom REST or GraphQL APIs.", price: 149, deliveryDays: 3 },
    { id: "s3", title: "Code Review & Optimization", description: "Thorough code review with optimization suggestions.", price: 79, deliveryDays: 1 },
  ],
  "agent-2": [
    { id: "s1", title: "AI-Powered Data Analysis", description: "Transform raw data into actionable insights.", price: 149, deliveryDays: 3 },
    { id: "s2", title: "Custom ML Model Training", description: "Train custom machine learning models.", price: 399, deliveryDays: 10 },
  ],
  "agent-3": [
    { id: "s1", title: "Modern UI/UX Design", description: "Beautiful, user-friendly interface designs.", price: 199, deliveryDays: 5 },
    { id: "s2", title: "Brand Identity Design", description: "Complete brand identity package.", price: 249, deliveryDays: 7 },
  ],
};

// Multi-question sets for mock mode
const MOCK_QUESTION_SETS = [
  ["What is the main goal of your project?", "Who is your target audience?"],
  ["What key features do you need?", "Do you have any specific technical requirements?", "What's your preferred tech stack?"],
  ["What's your timeline for this project?", "What's your budget range?"],
  ["Do you have any existing assets (designs, APIs, documentation)?", "Are there similar products you'd like to reference?"],
];

// Step indicator component
function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = [
    { num: 1, label: "Agent" },
    { num: 2, label: "Interview" },
    { num: 3, label: "Spec" },
    { num: 4, label: "Payment" },
  ];

  return (
    <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
      {steps.map((step, idx) => (
        <div key={step.num} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-all ${
                currentStep >= step.num
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 text-gray-500"
              } ${currentStep === step.num ? "ring-2 ring-emerald-500/50 ring-offset-2 ring-offset-[#0a0a0a]" : ""}`}
            >
              {currentStep > step.num ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step.num
              )}
            </div>
            <span className={`text-xs mt-1.5 ${currentStep >= step.num ? "text-emerald-400" : "text-gray-500"}`}>
              {step.label}
            </span>
          </div>
          {idx < steps.length - 1 && (
            <div
              className={`w-8 sm:w-16 h-0.5 mx-2 sm:mx-4 mb-5 transition-colors duration-300 ${
                currentStep > step.num ? "bg-emerald-500" : "bg-white/10"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

// Loading skeleton for agent/service card
function AgentServiceSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="bg-[#111] border border-white/10 rounded-xl p-6">
        <div className="h-4 w-24 bg-white/10 rounded mb-4" />
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/10 rounded-xl" />
          <div>
            <div className="h-6 w-32 bg-white/10 rounded mb-2" />
            <div className="h-4 w-24 bg-white/10 rounded" />
          </div>
        </div>
      </div>
      <div className="bg-[#111] border border-white/10 rounded-xl p-6">
        <div className="h-4 w-28 bg-white/10 rounded mb-4" />
        <div className="h-6 w-48 bg-white/10 rounded mb-2" />
        <div className="h-4 w-full bg-white/10 rounded mb-4" />
        <div className="flex justify-between pt-4 border-t border-white/10">
          <div className="h-4 w-24 bg-white/10 rounded" />
          <div className="h-8 w-16 bg-white/10 rounded" />
        </div>
      </div>
      <div className="h-14 w-full bg-white/10 rounded-xl" />
    </div>
  );
}

// Agent/Service info card for Step 1
function AgentServiceCard({
  agent,
  service,
  onContinue,
}: {
  agent: Agent | null;
  service: Service | null;
  onContinue: () => void;
}) {
  if (!agent) {
    return (
      <div className="text-center py-12">
        <div className="text-4xl mb-4">🔍</div>
        <h2 className="text-xl font-semibold mb-2">No Agent Selected</h2>
        <p className="text-gray-400 mb-6">Please select an agent from the marketplace.</p>
        <Link href="/marketplace" className="text-emerald-400 hover:text-emerald-300 transition">
          ← Browse Agents
        </Link>
      </div>
    );
  }

  const tierColors = {
    free: "text-gray-300",
    rising: "text-blue-300",
    verified: "text-emerald-300",
    premium: "text-amber-300",
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
        <h2 className="text-lg font-semibold text-gray-400 mb-4">Selected Agent</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-xl flex items-center justify-center text-3xl">
            {agent.avatar}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{agent.name}</h3>
            <span className={`text-sm ${tierColors[agent.tier]} capitalize`}>
              {agent.tier === "premium" && "⭐ "}
              {agent.tier === "verified" && "✓ "}
              {agent.tier} Agent
            </span>
          </div>
        </div>
      </div>

      {service && (
        <div className="bg-[#111] border border-white/10 rounded-xl p-6 hover:border-white/20 transition-colors">
          <h2 className="text-lg font-semibold text-gray-400 mb-4">Selected Service</h2>
          <h3 className="text-xl font-bold text-white mb-2">{service.title}</h3>
          <p className="text-gray-400 mb-4">{service.description}</p>
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <span className="text-gray-400">
              Delivery in {service.deliveryDays} day{service.deliveryDays > 1 ? "s" : ""}
            </span>
            <div>
              <span className="text-sm text-gray-400">From </span>
              <span className="text-2xl font-bold text-white">{service.price === 0 ? "Free" : `$${service.price}`}</span>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={onContinue}
        className="w-full bg-emerald-500 hover:bg-emerald-600 text-white py-4 rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
      >
        Start Interview
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

// Agent thinking indicator with animation
function AgentThinkingIndicator({ agentName, agentAvatar, message = "thinking..." }: { agentName: string; agentAvatar: string; message?: string }) {
  return (
    <div className="flex justify-start mb-4 animate-fade-in">
      <div className="flex items-start gap-3 max-w-[85%]">
        <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-sm flex-shrink-0">
          {agentAvatar}
        </div>
        <div>
          <span className="text-xs text-emerald-400 font-medium mb-1 block">{agentName}</span>
          <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms", animationDuration: "0.6s" }} />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms", animationDuration: "0.6s" }} />
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms", animationDuration: "0.6s" }} />
              </div>
              <span className="text-sm text-gray-400 ml-2">{message}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// SSE Connection Status Banner
function SSEConnectionBanner({ 
  status, 
  onReconnect, 
  onFallback 
}: { 
  status: SSEStatus; 
  onReconnect: () => void; 
  onFallback: () => void;
}) {
  if (status === "connected" || status === "connecting") return null;

  return (
    <div className="mb-4 p-3 bg-amber-500/20 border border-amber-500/30 rounded-xl animate-fade-in">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span className="text-sm text-amber-200">
            {status === "error" ? "Agent not responding" : "Connection lost"}
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReconnect}
            className="px-3 py-1.5 text-xs bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 rounded-lg transition flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Retry
          </button>
          <button
            onClick={onFallback}
            className="px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-gray-300 rounded-lg transition"
          >
            Use standard questions
          </button>
        </div>
      </div>
    </div>
  );
}

// Chat message component with agent persona
function ChatMessage({ message, agent }: { message: Message; agent: Agent | null }) {
  const isFromAgent = message.type === "question" || message.type === "intro";

  // Render multi-questions if present
  const renderContent = () => {
    if (message.questions && message.questions.length > 0) {
      return (
        <div className="space-y-3">
          {message.questions.map((q, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <span className="flex-shrink-0 w-6 h-6 bg-emerald-500/20 rounded-full flex items-center justify-center text-xs font-bold text-emerald-400">
                {idx + 1}
              </span>
              <SimpleMarkdown content={q} className="text-white" />
            </div>
          ))}
        </div>
      );
    }
    return <SimpleMarkdown content={message.content} className="text-white" />;
  };

  if (isFromAgent) {
    return (
      <div className="flex justify-start mb-4 animate-slide-up">
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-sm flex-shrink-0">
            {agent?.avatar || "🤖"}
          </div>
          <div>
            <span className="text-xs text-emerald-400 font-medium mb-1 block">{agent?.name || "Agent"}</span>
            <div className="bg-white/10 text-white rounded-2xl rounded-tl-none px-4 py-3">
              {renderContent()}
              <span className="text-xs text-gray-500 mt-2 block">
                {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-end mb-4 animate-slide-up">
      <div className="max-w-[80%]">
        <div className="bg-emerald-500 text-white rounded-2xl rounded-tr-none px-4 py-3">
          {renderContent()}
          <span className="text-xs text-emerald-200 mt-2 block text-right">
            {message.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>
    </div>
  );
}

// Adaptive progress indicator
function AdaptiveProgress({ questionIndex, totalQuestions }: { questionIndex: number; totalQuestions: number | null }) {
  // If total is known, show exact progress
  if (totalQuestions !== null && totalQuestions > 0) {
    const progress = Math.round((questionIndex / totalQuestions) * 100);
    return (
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-gray-400">
            Question {questionIndex} of {totalQuestions}
          </span>
          <span className="text-sm text-emerald-400">{progress}% Complete</span>
        </div>
        <div className="h-2 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    );
  }

  // Adaptive mode - show indeterminate progress
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400 flex items-center gap-2">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          Question {questionIndex}
        </span>
        <span className="text-sm text-emerald-400">In progress...</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-emerald-500/50 via-emerald-400 to-emerald-500/50 animate-shimmer" />
      </div>
    </div>
  );
}

// Interview chat UI
function InterviewChat({
  interview,
  agent,
  onAnswer,
  onBack,
  isLoading,
  isAgentTyping,
  sseStatus,
  onReconnect,
  onFallback,
  onAcceptSpec,
  onKeepChatting,
}: {
  interview: InterviewState;
  agent: Agent | null;
  onAnswer: (answer: string) => void;
  onBack: () => void;
  isLoading: boolean;
  isAgentTyping: boolean;
  sseStatus: SSEStatus;
  onReconnect: () => void;
  onFallback: () => void;
  onAcceptSpec: () => void;
  onKeepChatting?: () => void;
}) {
  const [inputValue, setInputValue] = useState("");
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [interview.messages, isLoading, isAgentTyping]);

  // Focus input
  useEffect(() => {
    if (inputRef.current && !interview.isComplete && sseStatus === "connected") {
      inputRef.current.focus();
    }
  }, [interview.currentQuestion, interview.isComplete, sseStatus]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
    if (e.target) e.target.value = ""; // Reset input
  };

  const removeFile = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((inputValue.trim() || attachedFiles.length > 0) && !isLoading && !isAgentTyping) {
      // Append file names to message if files attached
      let msg = inputValue.trim();
      if (attachedFiles.length > 0) {
        const fileNames = attachedFiles.map(f => f.name).join(", ");
        msg = msg ? `${msg}\n\n📎 Attached files: ${fileNames}` : `📎 Attached files: ${fileNames}`;
      }
      onAnswer(msg);
      setInputValue("");
      setAttachedFiles([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Determine loading message
  const getLoadingMessage = () => {
    if (sseStatus === "connecting") return "Connecting to agent...";
    if (isAgentTyping) return "thinking...";
    return "Starting interview...";
  };

  return (
    <div className="flex flex-col h-[600px] animate-fade-in">
      {/* SSE Connection Banner (for errors/disconnects) */}
      <SSEConnectionBanner 
        status={sseStatus} 
        onReconnect={onReconnect} 
        onFallback={onFallback} 
      />

      {/* Adaptive progress bar */}
      <AdaptiveProgress 
        questionIndex={interview.questionIndex} 
        totalQuestions={interview.totalQuestions} 
      />

      {/* Chat messages */}
      <div
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto bg-[#111] border border-white/10 rounded-xl p-4 mb-4 scroll-smooth"
      >
        {interview.messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
              <p>{sseStatus === "connecting" ? "Connecting to agent..." : "Starting interview..."}</p>
            </div>
          </div>
        ) : (
          interview.messages.map((msg) => (
            <ChatMessage key={msg.id} message={msg} agent={agent} />
          ))
        )}
        {(isLoading || isAgentTyping) && agent && interview.messages.length > 0 && (
          <AgentThinkingIndicator 
            agentName={agent.name} 
            agentAvatar={agent.avatar} 
            message={getLoadingMessage()}
          />
        )}
      </div>

      {/* Input area or completion CTA */}
      {interview.isComplete ? (
        <div className="space-y-3 animate-fade-in">
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 bg-emerald-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-emerald-400 font-semibold">Interview Complete</p>
                <p className="text-sm text-gray-400">Review the spec above, then accept or keep chatting</p>
              </div>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <button
              onClick={() => {
                // Allow user to keep typing by uncompleting
                setInputValue("");
                onKeepChatting?.();
              }}
              className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
            >
              💬 Keep Chatting
            </button>
            <button
              onClick={onAcceptSpec}
              className="flex-[2] py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              Accept Spec & Continue
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div>
          {/* Attached files preview */}
          {attachedFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {attachedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1.5 text-sm">
                  <span className="text-gray-300 truncate max-w-[150px]">{file.name}</span>
                  <button onClick={() => removeFile(idx)} className="text-gray-500 hover:text-red-400 transition">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
          <form onSubmit={handleSubmit} className="flex gap-3">
            <button
              type="button"
              onClick={onBack}
              className="px-4 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
              title="Go Back"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,.pdf,.doc,.docx,.txt,.md,.fig,.sketch"
              onChange={handleFileSelect}
              className="hidden"
            />
            {/* Attach button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-3 bg-white/10 hover:bg-white/20 text-gray-400 hover:text-white rounded-xl transition"
              title="Attach files (images, designs, documents)"
              disabled={isLoading || isAgentTyping}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                sseStatus === "connecting" 
                  ? "Waiting for agent..." 
                  : interview.currentQuestions.length > 1 
                    ? "Answer all questions above..." 
                    : "Type your answer..."
              }
              className="flex-1 bg-[#111] border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 resize-none transition-all"
              rows={2}
              disabled={isLoading || isAgentTyping || sseStatus !== "connected"}
            />
            <button
              type="submit"
              disabled={(!inputValue.trim() && attachedFiles.length === 0) || isLoading || isAgentTyping || sseStatus !== "connected"}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-all transform hover:scale-105 active:scale-95"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

// Spec display component
function SpecDisplay({
  spec,
  onEdit,
  onBack,
  onContinue,
  isEditing,
  editedSpec,
  setEditedSpec,
  setIsEditing,
  isFree,
}: {
  spec: string;
  onEdit: (newSpec: string) => void;
  onBack: () => void;
  onContinue: () => void;
  isEditing: boolean;
  editedSpec: string;
  setEditedSpec: (spec: string) => void;
  setIsEditing: (editing: boolean) => void;
  isFree?: boolean;
}) {
  const handleSave = () => {
    onEdit(editedSpec);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditedSpec(spec);
    setIsEditing(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-[#111] border border-white/10 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Generated Project Spec</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 text-emerald-400 hover:text-emerald-300 transition text-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Spec
            </button>
          )}
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <textarea
              value={editedSpec}
              onChange={(e) => setEditedSpec(e.target.value)}
              className="w-full h-80 bg-[#0a0a0a] border border-white/10 rounded-lg p-4 text-white font-mono text-sm focus:outline-none focus:border-emerald-500/50 resize-none"
            />
            <div className="flex gap-3 justify-end">
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#0a0a0a] border border-white/10 rounded-lg p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap text-gray-300 font-mono text-sm leading-relaxed">
              {spec}
            </pre>
          </div>
        )}
      </div>

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Edit Answers
        </button>
        <button
          onClick={onContinue}
          className="flex-1 py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition-all transform hover:scale-[1.02] active:scale-[0.98] flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          {isFree ? "Start Free Job" : "Continue to Payment"}
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// Main hire page content
function HirePageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const agentId = searchParams.get("agent") || "agent-1";
  const serviceId = searchParams.get("service");

  const [currentStep, setCurrentStep] = useState(1);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [spec, setSpec] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedSpec, setEditedSpec] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Twitter modal state (for demo mode)
  const [showTwitterModal, setShowTwitterModal] = useState(false);
  const [twitterHandle, setTwitterHandle] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(true); // Demo mode for hackathon

  // Interview state
  const [interview, setInterview] = useState<InterviewState>({
    id: null,
    currentQuestion: null,
    currentQuestions: [],
    questionIndex: 0,
    totalQuestions: null, // null = adaptive
    messages: [],
    isComplete: false,
  });

  // SSE connection state
  const [sseStatus, setSSEStatus] = useState<SSEStatus>("disconnected");
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [useFallbackMode, setUseFallbackMode] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Mock question index for offline mode
  const mockQuestionSetIndexRef = useRef(0);

  // Connect to SSE when interview starts
  const connectSSE = useCallback(() => {
    if (!interview.id || useFallbackMode) return;

    // Close existing connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    setSSEStatus("connecting");

    const eventSource = new EventSource(
      `${API_BASE_URL}/api/interview/${interview.id}/stream`
    );
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log("SSE connected to interview:", interview.id);
      setSSEStatus("connected");
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("SSE message received:", data);

        // Clear any pending timeout
        const timeout = (window as unknown as { __interviewTimeout?: NodeJS.Timeout }).__interviewTimeout;
        if (timeout) {
          clearTimeout(timeout);
        }

        if (data.type === "agent_message" || data.type === "question") {
          // Agent sent a message - add to chat
          const questions: string[] = data.questions || (data.message ? [data.message] : []);
          
          const newMessage: Message = {
            id: data.messageId || `q-${Date.now()}`,
            type: data.isIntro ? "intro" : "question",
            content: questions.length === 1 ? questions[0] : (data.message || ""),
            questions: questions.length > 1 ? questions : undefined,
            timestamp: new Date(),
          };

          setInterview((prev) => ({
            ...prev,
            currentQuestion: questions[0] || null,
            currentQuestions: questions,
            questionIndex: data.questionIndex ?? prev.questionIndex + 1,
            totalQuestions: data.totalQuestions ?? prev.totalQuestions,
            messages: [...prev.messages, newMessage],
          }));

          setIsAgentTyping(false);
        } else if (data.type === "interview_complete" || data.isComplete) {
          // Interview completed by agent
          setInterview((prev) => ({
            ...prev,
            isComplete: true,
          }));
          setIsAgentTyping(false);
          // Note: generateSpec will be called via useEffect when isComplete changes
        } else if (data.type === "typing") {
          // Agent is typing indicator
          setIsAgentTyping(true);
        } else if (data.type === "connected") {
          // Connection confirmed
          setSSEStatus("connected");
        }
      } catch (err) {
        console.error("Failed to parse SSE message:", err);
      }
    };

    eventSource.onerror = (err) => {
      console.error("SSE error:", err);
      setSSEStatus("error");
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [interview.id, useFallbackMode]);

  // Effect to connect SSE when interview ID changes
  useEffect(() => {
    if (interview.id && !useFallbackMode) {
      const cleanup = connectSSE();
      return cleanup;
    }
  }, [interview.id, connectSSE, useFallbackMode]);

  // Cleanup SSE on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Handle interview completion - generate spec
  useEffect(() => {
    if (interview.isComplete && currentStep === 2) {
      generateSpec();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [interview.isComplete]);

  // Reconnect SSE
  const handleReconnectSSE = useCallback(() => {
    setSSEStatus("connecting");
    connectSSE();
  }, [connectSSE]);

  // Switch to fallback mode (standard mock questions)
  const handleFallbackMode = useCallback(() => {
    setUseFallbackMode(true);
    setSSEStatus("disconnected");
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    // If we don't have any questions yet, start with mock questions
    if (interview.messages.length === 0 && agent) {
      const firstQuestionSet = MOCK_QUESTION_SETS[0];
      mockQuestionSetIndexRef.current = 0;
      
      const introMessage: Message = {
        id: `intro-${Date.now()}`,
        type: "intro",
        content: `Hi, I'm ${agent.name}! 👋 Let me learn about your project so I can help you best. I'll ask you a few questions to understand your needs.`,
        timestamp: new Date(),
      };

      const questionMessage: Message = {
        id: `q-${Date.now()}`,
        type: "question",
        content: firstQuestionSet.length === 1 ? firstQuestionSet[0] : "",
        questions: firstQuestionSet.length > 1 ? firstQuestionSet : undefined,
        timestamp: new Date(),
      };

      setInterview((prev) => ({
        ...prev,
        currentQuestion: firstQuestionSet[0],
        currentQuestions: firstQuestionSet,
        questionIndex: 1,
        messages: [introMessage, questionMessage],
      }));
    }
  }, [agent, interview.messages.length]);

  // Fetch agent and service data
  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const agentRes = await fetch(`${API_BASE_URL}/api/agents/${agentId}`);
        if (!agentRes.ok) throw new Error("API unavailable");
        const rawAgent = await agentRes.json();
        const agentData = rawAgent.agent || rawAgent;
        // Transform API data to frontend format
        setAgent({
          id: agentData.id,
          name: agentData.name,
          avatar: agentData.avatarUrl || agentData.avatar || "🤖",
          tier: agentData.trustTier || agentData.tier || "free",
        });

        if (serviceId) {
          const servicesRes = await fetch(`${API_BASE_URL}/api/agents/${agentId}/services`);
          if (servicesRes.ok) {
            const servicesData = await servicesRes.json();
            const services = servicesData.services || servicesData;
            const rawService = services.find((s: Record<string, unknown>) => s.id === serviceId);
            if (rawService) {
              setService({
                id: rawService.id as string,
                title: rawService.title as string,
                description: rawService.description as string,
                price: (rawService.priceUsdc ?? rawService.price ?? 0) as number,
                deliveryDays: (rawService.deliveryDays || 1) as number,
              });
            }
          }
        }
      } catch {
        // Use mock data
        console.log("Using mock data (backend unavailable)");
        setAgent(MOCK_AGENTS[agentId] || MOCK_AGENTS["agent-1"]);
        if (serviceId && MOCK_SERVICES[agentId]) {
          const foundService = MOCK_SERVICES[agentId].find((s) => s.id === serviceId);
          setService(foundService || null);
        }
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [agentId, serviceId]);

  // Start interview - shows Twitter modal first in demo mode
  const startInterview = async () => {
    if (!agent) return;
    
    if (isDemoMode) {
      // Show Twitter modal first
      setShowTwitterModal(true);
      return;
    }
    
    // Non-demo mode (original flow)
    setIsLoading(true);
    setError(null);
    setSSEStatus("connecting");
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, serviceId }),
      });

      if (!res.ok) throw new Error("API unavailable");

      const data = await res.json();
      const interviewId = data.id || data.interviewId;
      
      setInterview({
        id: interviewId,
        currentQuestion: null,
        currentQuestions: [],
        questionIndex: 0,
        totalQuestions: data.totalQuestions || null,
        messages: [],
        isComplete: false,
      });
      
      setUseFallbackMode(false);
      setCurrentStep(2);
    } catch {
      console.log("Using mock interview (backend unavailable)");
      handleFallbackMode();
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  // Demo interview with GPT-4o (after Twitter modal)
  const startDemoInterview = async (twitter: string) => {
    if (!agent) return;
    
    setShowTwitterModal(false);
    setTwitterHandle(twitter);
    setIsLoading(true);
    setError(null);
    
    try {
      const res = await fetch(`${API_BASE_URL}/api/demo-interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          agentId, 
          serviceId,
          projectType: service?.title || "Project",
          twitterHandle: twitter || null,
          description: service?.description || ""
        }),
      });

      if (!res.ok) throw new Error("Demo API unavailable");

      const data = await res.json();
      
      // Add the AI's first message
      const introMessage: Message = {
        id: data.message.id,
        type: "intro",
        content: data.message.content,
        timestamp: new Date(),
        agentName: data.agent?.name || agent.name,
        agentAvatar: data.agent?.avatar || agent.avatar,
      };

      setInterview({
        id: data.interviewId,
        currentQuestion: data.message.content,
        currentQuestions: [],
        questionIndex: 1,
        totalQuestions: null, // Adaptive GPT-4o interview
        messages: [introMessage],
        isComplete: false,
      });
      
      setUseFallbackMode(false);
      setIsDemoMode(true);
      setCurrentStep(2);
    } catch (err) {
      console.error("Demo interview error:", err);
      // Fallback to mock mode
      handleFallbackMode();
      setCurrentStep(2);
    } finally {
      setIsLoading(false);
    }
  };

  // Submit answer - agent responds via SSE
  const submitAnswer = async (answer: string) => {
    // Add user's answer to messages
    const answerMsg: Message = {
      id: `a-${Date.now()}`,
      type: "answer",
      content: answer,
      timestamp: new Date(),
    };

    setInterview((prev) => ({
      ...prev,
      messages: [...prev.messages, answerMsg],
    }));

    setError(null);

    // If in demo mode with GPT-4o, use demo-interview API
    if (isDemoMode && interview.id && interview.id !== "mock-interview") {
      setIsLoading(true);
      setIsAgentTyping(true);
      
      try {
        const res = await fetch(`${API_BASE_URL}/api/demo-interview/${interview.id}/respond`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: answer }),
        });

        if (!res.ok) throw new Error("Failed to get AI response");

        const data = await res.json();
        
        // Add AI response to messages
        const aiMessage: Message = {
          id: data.message.id,
          type: "question",
          content: data.message.content,
          timestamp: new Date(),
        };

        setInterview((prev) => ({
          ...prev,
          currentQuestion: data.message.content,
          currentQuestions: [],
          questionIndex: data.exchangeCount + 1,
          messages: [...prev.messages, aiMessage],
          isComplete: data.readyForSpec && data.exchangeCount >= 5,
        }));

        // If ready for spec, auto-generate
        if (data.readyForSpec && data.exchangeCount >= 5) {
          await generateDemoSpec();
        }
      } catch (err) {
        console.error("Demo response error:", err);
        setError("Failed to get AI response. Please try again.");
      } finally {
        setIsLoading(false);
        setIsAgentTyping(false);
      }
      return;
    }

    // If in fallback/mock mode, use old logic
    if (useFallbackMode || interview.id === "mock-interview") {
      setIsLoading(true);
      mockQuestionSetIndexRef.current += 1;
      const nextIdx = mockQuestionSetIndexRef.current;

      if (nextIdx >= MOCK_QUESTION_SETS.length) {
        setInterview((prev) => ({
          ...prev,
          isComplete: true,
        }));
        // Generate mock spec
        await generateSpec();
      } else {
        // Simulate thinking delay
        await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 400));

        const nextQuestionSet = MOCK_QUESTION_SETS[nextIdx];
        const nextQuestion: Message = {
          id: `q-${Date.now()}`,
          type: "question",
          content: nextQuestionSet.length === 1 ? nextQuestionSet[0] : "",
          questions: nextQuestionSet.length > 1 ? nextQuestionSet : undefined,
          timestamp: new Date(),
        };

        setInterview((prev) => ({
          ...prev,
          currentQuestion: nextQuestionSet[0],
          currentQuestions: nextQuestionSet,
          questionIndex: nextIdx + 1,
          messages: [...prev.messages, nextQuestion],
        }));
      }
      setIsLoading(false);
      return;
    }

    // Real mode - POST answer and wait for SSE response
    setIsAgentTyping(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/${interview.id}/answer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answer }),
      });

      if (!res.ok) {
        throw new Error("Failed to submit answer");
      }

      // Agent will respond via SSE - the SSE handler will:
      // 1. Receive the agent's response
      // 2. Add it to messages
      // 3. Set isAgentTyping to false
      // 4. Handle isComplete if interview is done

      // Set a timeout for agent response
      const timeout = setTimeout(() => {
        if (isAgentTyping) {
          setSSEStatus("error");
          setIsAgentTyping(false);
        }
      }, 30000); // 30 second timeout

      // Store timeout to clear later (will be cleared by SSE handler)
      (window as unknown as { __interviewTimeout?: NodeJS.Timeout }).__interviewTimeout = timeout;

    } catch (err) {
      console.error("Failed to submit answer:", err);
      setIsAgentTyping(false);
      setSSEStatus("error");
      setError("Failed to submit answer. Please try again.");
    }
  };

  // Generate spec for demo mode (GPT-4o)
  const generateDemoSpec = async () => {
    if (!interview.id) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/demo-interview/${interview.id}/generate-spec`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("Failed to generate spec");

      const data = await res.json();
      setSpec(data.spec);
      setEditedSpec(data.spec);
      setCurrentStep(3);
    } catch (err) {
      console.error("Generate spec error:", err);
      // Fallback to mock spec
      const answers = interview.messages.filter((m) => m.type === "answer").map((m) => m.content);
      const mockSpec = generateMockSpec(answers);
      setSpec(mockSpec);
      setEditedSpec(mockSpec);
      setCurrentStep(3);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate spec
  const generateSpec = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/interview/${interview.id}/generate`, {
        method: "POST",
      });

      if (!res.ok) throw new Error("API unavailable");

      const data = await res.json();
      const generatedSpec = data.spec || data.specification;
      setSpec(generatedSpec);
      setEditedSpec(generatedSpec);
    } catch {
      // Generate mock spec from answers
      const answers = interview.messages.filter((m) => m.type === "answer").map((m) => m.content);
      const mockSpec = generateMockSpec(answers);
      setSpec(mockSpec);
      setEditedSpec(mockSpec);
    } finally {
      setIsLoading(false);
      setCurrentStep(3);
    }
  };

  // Generate mock spec from answers
  const generateMockSpec = (answers: string[]): string => {
    return `# Project Specification

## Overview
${answers[0] || "Custom project development"}

## Target Audience
${answers[0]?.includes("audience") ? answers[0] : answers[1] || "End users and stakeholders"}

## Requirements & Features
${answers[1] || answers[2] || "To be defined during development"}

## Timeline & Budget
${answers[2] || answers[3] || "Standard delivery timeline"}

## Existing Assets
${answers[3] || "None specified"}

---

## Agent Assignment
- **Agent:** ${agent?.name || "Selected Agent"}
- **Service:** ${service?.title || "Custom Service"}
- **Estimated Price:** ${service?.price === 0 ? "Free" : `$${service?.price || "TBD"}`}
- **Estimated Delivery:** ${service?.deliveryDays || "TBD"} days

## Next Steps
1. Review and approve this specification
2. Complete payment through secure escrow
3. Agent begins work immediately
4. Receive deliverables within timeline
`;
  };

  // Go back to previous step
  const goBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Continue to payment (step 4) or skip if free
  const continueToPayment = async () => {
    // If service is free, skip payment and create job directly
    if (service && service.price === 0) {
      setIsLoading(true);
      try {
        const res = await fetch(`${API_BASE_URL}/api/jobs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            agentId: agent?.id,
            serviceId: service.id,
            clientWallet: "0x0000000000000000000000000000000000000000",
            title: `Free Trial: ${service.title}`,
            requirements: spec || editedSpec || "Free trial task",
            priceUsdc: 0,
          }),
        });
        const data = await res.json();
        if (res.ok && (data.job?.id || data.id)) {
          window.location.href = `/jobs/${data.job?.id || data.id}`;
          return;
        } else {
          console.error("Job creation response:", data);
          setError(data.error || "Failed to create job. Please try again.");
        }
      } catch (err) {
        console.error("Failed to create free job:", err);
        setError("Failed to create job. Please try again.");
      } finally {
        setIsLoading(false);
      }
      return; // Don't fall through to payment
    }
    setCurrentStep(4);
  };

  // Retry on error
  const handleRetry = () => {
    setError(null);
    if (currentStep === 1) {
      setLoading(true);
      window.location.reload();
    }
  };

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
          <div className="max-w-2xl mx-auto">
            <StepIndicator currentStep={1} />
            <AgentServiceSkeleton />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      {/* Twitter Modal for Demo Mode */}
      <TwitterModal
        isOpen={showTwitterModal}
        onSubmit={startDemoInterview}
        onClose={() => setShowTwitterModal(false)}
        agentName={agent?.name}
        serviceName={service?.title}
      />

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

      {/* Main Content */}
      <main className="pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl mx-auto">
          {/* Step Indicator */}
          <StepIndicator currentStep={currentStep} />

          {/* Error State */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-xl animate-fade-in">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-red-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-400">Something went wrong</p>
                  <p className="text-sm text-gray-400 mt-1">{error}</p>
                  <button
                    onClick={handleRetry}
                    className="mt-3 text-sm text-emerald-400 hover:text-emerald-300 transition flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Try Again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step Content */}
          {currentStep === 1 && (
            <AgentServiceCard agent={agent} service={service} onContinue={startInterview} />
          )}

          {currentStep === 2 && (
            <InterviewChat
              interview={interview}
              agent={agent}
              onAnswer={submitAnswer}
              onBack={goBack}
              isLoading={isLoading}
              isAgentTyping={isAgentTyping}
              sseStatus={useFallbackMode ? "connected" : sseStatus}
              onReconnect={handleReconnectSSE}
              onFallback={handleFallbackMode}
              onAcceptSpec={() => {
                // Use the last agent message as the spec
                const lastAgentMsg = [...interview.messages].reverse().find(m => m.type === "question" || m.type === "intro");
                const specText = lastAgentMsg?.content || "Project spec from interview";
                setSpec(specText);
                setEditedSpec(specText);
                setCurrentStep(3);
              }}
              onKeepChatting={() => {
                setInterview(prev => ({ ...prev, isComplete: false }));
              }}
            />
          )}

          {currentStep === 3 && (
            <SpecDisplay
              spec={spec}
              onEdit={setSpec}
              onBack={goBack}
              onContinue={continueToPayment}
              isEditing={isEditing}
              editedSpec={editedSpec}
              setEditedSpec={setEditedSpec}
              setIsEditing={setIsEditing}
              isFree={service?.price === 0}
            />
          )}

          {currentStep === 4 && (
            <PaymentStep
              servicePrice={service?.price || 99}
              serviceName={service?.title || "Custom Project"}
              agentName={agent?.name || "Agent"}
              agentId={agentId}
              onSuccess={(jobId) => {
                console.log("Payment successful, job ID:", jobId);
                // Redirect to dashboard after success
                setTimeout(() => {
                  router.push("/dashboard");
                }, 2000);
              }}
            />
          )}
        </div>
      </main>

    </div>
  );
}

// Main component with Suspense
export default function HirePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin mx-auto mb-4" />
            <p className="text-gray-400">Loading...</p>
          </div>
        </div>
      }
    >
      <HirePageContent />
    </Suspense>
  );
}
