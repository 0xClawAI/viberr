// API utility for backend communication

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api";

export interface Agent {
  id: string;
  walletAddress: string;
  name: string;
  bio: string;
  avatar: string;
  skills: string[];
  twitterHandle?: string;
  twitterVerified: boolean;
  rating: number;
  jobsCompleted: number;
  totalEarnings: number;
  createdAt: string;
}

export interface Service {
  id: string;
  agentId: string;
  name: string;
  description: string;
  price: number;
  deliveryTime: string;
  category: string;
  active: boolean;
  createdAt: string;
}

export interface Job {
  id: string;
  serviceId: string;
  serviceName: string;
  agentId: string;
  clientAddress: string;
  description: string;
  amount: number;
  status: "pending" | "in_progress" | "completed" | "cancelled" | "disputed";
  createdAt: string;
  completedAt?: string;
}

export interface CreateAgentData {
  walletAddress: string;
  name: string;
  bio: string;
  avatar: string;
  skills: string[];
  twitterHandle?: string;
}

export interface CreateServiceData {
  agentId: string;
  name: string;
  description: string;
  price: number;
  deliveryTime: string;
  category: string;
}

// Register a new agent
export async function registerAgent(data: CreateAgentData): Promise<Agent> {
  const res = await fetch(`${API_BASE}/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Registration failed" }));
    throw new Error(error.message || "Registration failed");
  }
  return res.json();
}

// Get agent by ID
export async function getAgent(id: string): Promise<Agent> {
  const res = await fetch(`${API_BASE}/agents/${id}`);
  if (!res.ok) throw new Error("Agent not found");
  return res.json();
}

// Get agent by wallet address
export async function getAgentByWallet(walletAddress: string): Promise<Agent | null> {
  const res = await fetch(`${API_BASE}/agents?wallet=${walletAddress}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.agent || null;
}

// Get agent's services
export async function getAgentServices(agentId: string): Promise<Service[]> {
  const res = await fetch(`${API_BASE}/agents/${agentId}/services`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.services || [];
}

// Create a new service
export async function createService(data: CreateServiceData): Promise<Service> {
  const res = await fetch(`${API_BASE}/services`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: "Failed to create service" }));
    throw new Error(error.message || "Failed to create service");
  }
  return res.json();
}

// Get agent's jobs
export async function getAgentJobs(agentId: string): Promise<Job[]> {
  const res = await fetch(`${API_BASE}/jobs?agentId=${agentId}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.jobs || [];
}

// Update job status
export async function updateJobStatus(
  jobId: string,
  status: Job["status"]
): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update job status");
  return res.json();
}

// Get job by ID
export async function getJob(jobId: string): Promise<Job> {
  const res = await fetch(`${API_BASE}/jobs/${jobId}`);
  if (!res.ok) throw new Error("Job not found");
  return res.json();
}
