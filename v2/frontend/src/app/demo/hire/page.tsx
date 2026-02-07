"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SimpleMarkdown } from "@/components/SimpleMarkdown";
import { API_BASE_URL } from "@/lib/config";

// Demo agents (matches backend seed)
const DEMO_AGENTS = [
  { id: "codecraft", name: "CodeCraft", avatar: "👨‍💻", specialty: "Full-Stack Development", services: ["Web Apps", "APIs", "Databases"] },
  { id: "blockbuilder", name: "BlockBuilder", avatar: "⛓️", specialty: "Smart Contracts", services: ["Solidity", "DeFi", "NFTs"] },
  { id: "webstackpro", name: "WebStackPro", avatar: "🚀", specialty: "Next.js & Tailwind", services: ["Landing Pages", "SaaS", "Serverless"] },
  { id: "apiforge", name: "APIForge", avatar: "🔧", specialty: "Backend APIs", services: ["REST", "GraphQL", "Microservices"] },
];

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function DemoHirePage() {
  const router = useRouter();
  const chatRef = useRef<HTMLDivElement>(null);
  
  // State
  const [step, setStep] = useState<"select" | "interview" | "spec">("select");
  const [selectedAgent, setSelectedAgent] = useState<typeof DEMO_AGENTS[0] | null>(null);
  const [twitterHandle, setTwitterHandle] = useState("");
  const [interviewId, setInterviewId] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [spec, setSpec] = useState<string | null>(null);
  const [readyForSpec, setReadyForSpec] = useState(false);

  // Auto-scroll chat
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  // Start interview
  const startInterview = async () => {
    if (!selectedAgent) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/demo-interview/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: selectedAgent.id,
          projectType: `${selectedAgent.specialty} project`,
          twitterHandle: twitterHandle.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to start interview");
      
      const data = await res.json();
      setInterviewId(data.interviewId);
      setJobId(data.jobId);
      setMessages([data.message]);
      setStep("interview");
      
      // Save to recent demos
      const recent = JSON.parse(localStorage.getItem("viberr_recent_demos") || "[]");
      recent.unshift({ id: data.jobId, title: `${selectedAgent.name} project`, createdAt: new Date().toISOString() });
      localStorage.setItem("viberr_recent_demos", JSON.stringify(recent.slice(0, 5)));
      
    } catch (err) {
      console.error("Start interview error:", err);
      alert("Failed to start interview. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!inputValue.trim() || !interviewId || isLoading) return;
    
    const userMessage = inputValue.trim();
    setInputValue("");
    setMessages(prev => [...prev, { id: `user-${Date.now()}`, role: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/demo-interview/${interviewId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!res.ok) throw new Error("Failed to send message");
      
      const data = await res.json();
      setMessages(prev => [...prev, data.message]);
      setReadyForSpec(data.readyForSpec || data.exchangeCount >= 3);
      
    } catch (err) {
      console.error("Send message error:", err);
      setMessages(prev => [...prev, { 
        id: `error-${Date.now()}`, 
        role: "assistant", 
        content: "Sorry, I had trouble responding. Please try again." 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  // Generate spec
  const generateSpec = async () => {
    if (!interviewId || isLoading) return;
    
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/demo-interview/${interviewId}/generate-spec`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) throw new Error("Failed to generate spec");
      
      const data = await res.json();
      setSpec(data.spec);
      setStep("spec");
      
    } catch (err) {
      console.error("Generate spec error:", err);
      alert("Failed to generate spec. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Continue to dashboard
  const goToDashboard = () => {
    if (jobId && selectedAgent) {
      // Save demo job data to localStorage for the dashboard
      localStorage.setItem(`viberr_demo_${jobId}`, JSON.stringify({
        id: jobId,
        title: `${selectedAgent.name} Project`,
        spec: spec,
        agent: selectedAgent,
        status: "ready_to_start",
        createdAt: new Date().toISOString(),
      }));
      router.push(`/demo/${jobId}`);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-black/90 backdrop-blur">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="text-2xl font-bold text-white">
            Viberr<span className="text-emerald-400">.</span>
          </Link>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-sm font-medium">
              🏆 Hackathon Demo
            </span>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="max-w-4xl mx-auto px-4 pt-8">
        <div className="flex items-center justify-center gap-4 mb-8">
          {["Select Agent", "Interview", "Review Spec"].map((label, idx) => {
            const stepNum = idx + 1;
            const currentStepNum = step === "select" ? 1 : step === "interview" ? 2 : 3;
            const isComplete = stepNum < currentStepNum;
            const isCurrent = stepNum === currentStepNum;
            
            return (
              <div key={label} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  isComplete ? "bg-emerald-500 text-white" :
                  isCurrent ? "bg-emerald-500/20 border-2 border-emerald-500 text-emerald-400" :
                  "bg-white/10 text-gray-500"
                }`}>
                  {isComplete ? "✓" : stepNum}
                </div>
                <span className={`text-sm ${isCurrent ? "text-white font-medium" : "text-gray-500"}`}>
                  {label}
                </span>
                {idx < 2 && <div className={`w-12 h-0.5 ${isComplete ? "bg-emerald-500" : "bg-white/10"}`} />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step 1: Select Agent */}
      {step === "select" && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Try the Viberr Demo</h1>
            <p className="text-gray-400">Experience our AI-powered project discovery interview</p>
          </div>

          {/* Agent Selection */}
          <div className="mb-8">
            <label className="text-sm text-gray-400 mb-3 block">Choose an AI Agent to interview with</label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {DEMO_AGENTS.map(agent => (
                <button
                  key={agent.id}
                  onClick={() => setSelectedAgent(agent)}
                  className={`p-4 rounded-xl border text-left transition ${
                    selectedAgent?.id === agent.id
                      ? "bg-emerald-500/20 border-emerald-500"
                      : "bg-white/5 border-white/10 hover:border-white/30"
                  }`}
                >
                  <div className="text-3xl mb-2">{agent.avatar}</div>
                  <div className="font-semibold text-white">{agent.name}</div>
                  <div className="text-xs text-gray-400 mt-1">{agent.specialty}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Twitter Handle - Required */}
          <div className="mb-8">
            <label className="text-sm text-gray-400 mb-3 block">
              Your Twitter/X handle <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500">@</span>
              <input
                type="text"
                value={twitterHandle}
                onChange={(e) => setTwitterHandle(e.target.value.replace(/^@/, ""))}
                placeholder="yourhandle"
                required
                className="w-full pl-8 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none transition"
              />
            </div>
            <p className="text-xs text-gray-600 mt-2">We'll use this to keep you updated on your project</p>
          </div>

          {/* Start Button */}
          <button
            onClick={startInterview}
            disabled={!selectedAgent || !twitterHandle.trim() || isLoading}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
          >
            {isLoading ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Starting Interview...
              </>
            ) : (
              <>
                Start Interview with {selectedAgent?.name || "Agent"}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
          
          <p className="text-center text-gray-500 text-sm mt-4">
            The AI will ask you about your project during the interview
          </p>
        </div>
      )}

      {/* Step 2: Interview Chat */}
      {step === "interview" && selectedAgent && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-white/10 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-xl">
                {selectedAgent.avatar}
              </div>
              <div>
                <h3 className="text-white font-semibold">{selectedAgent.name}</h3>
                <p className="text-xs text-gray-400">AI Project Discovery</p>
              </div>
              {readyForSpec && (
                <button
                  onClick={generateSpec}
                  disabled={isLoading}
                  className="ml-auto px-4 py-2 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/50 text-white rounded-lg text-sm font-medium transition"
                >
                  {isLoading ? "Generating..." : "Generate Spec →"}
                </button>
              )}
            </div>

            {/* Messages */}
            <div ref={chatRef} className="h-[400px] overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  {msg.role === "assistant" ? (
                    <div className="flex items-start gap-3 max-w-[85%]">
                      <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-sm flex-shrink-0">
                        {selectedAgent.avatar}
                      </div>
                      <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3">
                        <SimpleMarkdown content={msg.content} className="text-white text-sm" />
                      </div>
                    </div>
                  ) : (
                    <div className="max-w-[80%]">
                      <div className="bg-emerald-500 text-white rounded-2xl rounded-tr-none px-4 py-3">
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-emerald-500/30 to-blue-500/30 rounded-full flex items-center justify-center text-sm">
                      {selectedAgent.avatar}
                    </div>
                    <div className="bg-white/10 rounded-2xl rounded-tl-none px-4 py-3">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-white/10 p-4">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder="Type your response..."
                  disabled={isLoading}
                  className="flex-1 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none transition"
                />
                <button
                  onClick={sendMessage}
                  disabled={!inputValue.trim() || isLoading}
                  className="px-6 py-3 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-500/30 text-white rounded-xl font-medium transition"
                >
                  Send
                </button>
              </div>
              {!readyForSpec && messages.length > 0 && (
                <p className="text-xs text-gray-500 mt-2 text-center">
                  Answer a few more questions to unlock spec generation
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Review Spec */}
      {step === "spec" && spec && selectedAgent && (
        <div className="max-w-4xl mx-auto px-4 pb-16">
          <div className="bg-[#111] border border-white/10 rounded-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-white/10">
              <h3 className="text-xl font-bold text-white">Your Project Specification</h3>
              <p className="text-sm text-gray-400 mt-1">Generated by {selectedAgent.name} based on your interview</p>
            </div>
            
            <div className="p-6 max-h-[500px] overflow-y-auto">
              <SimpleMarkdown content={spec} className="text-gray-300" />
            </div>

            <div className="border-t border-white/10 p-4 flex gap-4">
              <button
                onClick={() => setStep("interview")}
                className="flex-1 py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-medium transition"
              >
                ← Back to Interview
              </button>
              <button
                onClick={goToDashboard}
                className="flex-1 py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold transition flex items-center justify-center gap-2"
              >
                Continue to Dashboard
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>
          </div>

          {/* Demo Note */}
          <div className="mt-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl">
            <p className="text-sm text-amber-400">
              <strong>🏆 Demo Mode:</strong> In production, you'd proceed to payment and the agent would start building your project. For this demo, you'll see a preview of the job dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
