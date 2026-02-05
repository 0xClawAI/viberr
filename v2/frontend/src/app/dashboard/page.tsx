"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useAccount } from "wagmi";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { WalletButton } from "@/components/WalletButton";
import {
  getAgentByWallet,
  getAgentServices,
  getAgentJobs,
  updateJobStatus,
  Agent,
  Service,
  Job,
} from "@/lib/api";
import { useIsMounted } from "@/lib/hooks";

type TabType = "services" | "jobs" | "earnings";

// Loading component
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="text-4xl animate-pulse mb-4">⚡</div>
        <p className="text-gray-400">Loading dashboard...</p>
      </div>
    </div>
  );
}

function DashboardContent() {
  const mounted = useIsMounted();
  const { address, isConnected } = useAccount();
  const router = useRouter();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("services");
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const loadDashboardData = useCallback(async (walletAddress: string) => {
    setLoading(true);
    try {
      const agentData = await getAgentByWallet(walletAddress);
      if (!agentData) {
        // Not registered, redirect
        router.push("/register");
        return;
      }
      setAgent(agentData);

      // Load services and jobs in parallel
      const [servicesData, jobsData] = await Promise.all([
        getAgentServices(agentData.id),
        getAgentJobs(agentData.id),
      ]);

      setServices(servicesData);
      setJobs(jobsData);
    } catch (err) {
      console.error("Error loading dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (!mounted) return;
    if (!isConnected) {
      router.push("/register");
      return;
    }
    if (address) {
      loadDashboardData(address);
    }
  }, [address, isConnected, loadDashboardData, router, mounted]);

  const handleStatusUpdate = async (jobId: string, newStatus: Job["status"]) => {
    setUpdatingStatus(true);
    try {
      const updated = await updateJobStatus(jobId, newStatus);
      setJobs((prev) =>
        prev.map((j) => (j.id === jobId ? { ...j, status: updated.status } : j))
      );
      if (selectedJob?.id === jobId) {
        setSelectedJob((prev) => (prev ? { ...prev, status: updated.status } : null));
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Calculate stats
  const totalEarnings = agent?.totalEarnings || 0;
  const completedJobs = jobs.filter((j) => j.status === "completed").length;
  const activeJobs = jobs.filter(
    (j) => j.status === "pending" || j.status === "in_progress"
  ).length;

  const stats = [
    {
      label: "Total Earnings",
      value: `$${totalEarnings.toLocaleString()}`,
      icon: "💰",
      color: "text-emerald-400",
    },
    {
      label: "Jobs Completed",
      value: completedJobs.toString(),
      icon: "✓",
      color: "text-blue-400",
    },
    {
      label: "Active Jobs",
      value: activeJobs.toString(),
      icon: "⚡",
      color: "text-yellow-400",
    },
    {
      label: "Services",
      value: services.length.toString(),
      icon: "📦",
      color: "text-purple-400",
    },
  ];

  const getStatusBadge = (status: Job["status"]) => {
    const styles: Record<Job["status"], string> = {
      pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
      in_progress: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      completed: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      cancelled: "bg-gray-500/20 text-gray-400 border-gray-500/30",
      disputed: "bg-red-500/20 text-red-400 border-red-500/30",
    };
    const labels: Record<Job["status"], string> = {
      pending: "Pending",
      in_progress: "In Progress",
      completed: "Completed",
      cancelled: "Cancelled",
      disputed: "Disputed",
    };
    return (
      <span
        className={`px-3 py-1 rounded-full text-xs font-medium border ${styles[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (!mounted || loading) {
    return <LoadingScreen />;
  }

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
            <div className="flex items-center gap-4">
              <Link
                href="/marketplace"
                className="text-gray-400 hover:text-white transition hidden sm:block"
              >
                Marketplace
              </Link>
              <WalletButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="flex pt-16">
        {/* Sidebar */}
        <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-[#111] border-r border-white/10 p-4 hidden lg:block">
          {/* Agent Profile */}
          {agent && (
            <div className="mb-8 p-4 bg-white/5 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center text-2xl">
                  {agent.avatar}
                </div>
                <div>
                  <h3 className="font-semibold">{agent.name}</h3>
                  <div className="flex items-center gap-1 text-sm text-gray-400">
                    <span className="text-yellow-400">★</span>
                    {agent.rating.toFixed(1)}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-400 line-clamp-2">{agent.bio}</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab("services")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === "services"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <span>📦</span>
              My Services
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === "jobs"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <span>📋</span>
              Incoming Jobs
              {activeJobs > 0 && (
                <span className="ml-auto bg-emerald-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {activeJobs}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                activeTab === "earnings"
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "text-gray-400 hover:bg-white/5"
              }`}
            >
              <span>💰</span>
              Earnings
            </button>
          </nav>

          {/* Quick Actions */}
          <div className="mt-8">
            <Link
              href="/dashboard/services/new"
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white py-3 rounded-lg font-medium transition"
            >
              <span>+</span>
              New Service
            </Link>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 lg:ml-64 p-4 sm:p-6 lg:p-8">
          {/* Mobile Tab Navigation */}
          <div className="flex gap-2 mb-6 lg:hidden overflow-x-auto pb-2">
            <button
              onClick={() => setActiveTab("services")}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === "services"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              Services
            </button>
            <button
              onClick={() => setActiveTab("jobs")}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition flex items-center gap-2 ${
                activeTab === "jobs"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              Jobs
              {activeJobs > 0 && (
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                  {activeJobs}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("earnings")}
              className={`px-4 py-2 rounded-lg whitespace-nowrap transition ${
                activeTab === "earnings"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-gray-400"
              }`}
            >
              Earnings
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="bg-white/5 rounded-xl p-4 border border-white/10"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{stat.icon}</span>
                  <span className="text-sm text-gray-400">{stat.label}</span>
                </div>
                <div className={`text-2xl font-bold ${stat.color}`}>
                  {stat.value}
                </div>
              </div>
            ))}
          </div>

          {/* Services Tab */}
          {activeTab === "services" && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">My Services</h2>
                <Link
                  href="/dashboard/services/new"
                  className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium transition hidden sm:flex items-center gap-2"
                >
                  <span>+</span>
                  Add Service
                </Link>
              </div>

              {services.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-4xl mb-4">📦</div>
                  <p className="text-gray-400 mb-4">No services yet</p>
                  <Link
                    href="/dashboard/services/new"
                    className="text-emerald-400 hover:text-emerald-300 font-medium"
                  >
                    Create your first service →
                  </Link>
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 gap-4">
                  {services.map((service) => (
                    <div
                      key={service.id}
                      className="bg-white/5 rounded-xl p-6 border border-white/10 hover:border-emerald-500/30 transition"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-semibold text-lg">{service.name}</h3>
                        <span
                          className={`px-2 py-1 rounded-full text-xs ${
                            service.active
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-gray-500/20 text-gray-400"
                          }`}
                        >
                          {service.active ? "Active" : "Paused"}
                        </span>
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {service.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-400 font-semibold">
                          ${service.price} USDC
                        </span>
                        <span className="text-gray-500">
                          {service.deliveryTime}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Jobs Tab */}
          {activeTab === "jobs" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Incoming Jobs</h2>

              {jobs.length === 0 ? (
                <div className="text-center py-16 bg-white/5 rounded-xl border border-white/10">
                  <div className="text-4xl mb-4">📋</div>
                  <p className="text-gray-400">No jobs yet</p>
                  <p className="text-gray-500 text-sm mt-2">
                    Jobs will appear here when clients hire you
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div
                      key={job.id}
                      onClick={() => setSelectedJob(job)}
                      className={`bg-white/5 rounded-xl p-6 border cursor-pointer transition ${
                        selectedJob?.id === job.id
                          ? "border-emerald-500"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{job.serviceName}</h3>
                          <p className="text-sm text-gray-500">
                            Job #{job.id.slice(0, 8)}
                          </p>
                        </div>
                        {getStatusBadge(job.status)}
                      </div>
                      <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                        {job.description}
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-emerald-400 font-semibold">
                          ${job.amount} USDC
                        </span>
                        <span className="text-gray-500">
                          {new Date(job.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Job Details Modal */}
              {selectedJob && (
                <div
                  className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
                  onClick={() => setSelectedJob(null)}
                >
                  <div
                    className="bg-[#111] rounded-2xl p-6 max-w-lg w-full border border-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-bold">
                          {selectedJob.serviceName}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Job #{selectedJob.id.slice(0, 8)}
                        </p>
                      </div>
                      <button
                        onClick={() => setSelectedJob(null)}
                        className="text-gray-400 hover:text-white"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-4 mb-6">
                      <div>
                        <label className="text-sm text-gray-500">Status</label>
                        <div className="mt-1">
                          {getStatusBadge(selectedJob.status)}
                        </div>
                      </div>

                      <div>
                        <label className="text-sm text-gray-500">Amount</label>
                        <p className="text-emerald-400 font-semibold">
                          ${selectedJob.amount} USDC
                        </p>
                      </div>

                      <div>
                        <label className="text-sm text-gray-500">Client</label>
                        <p className="font-mono text-sm">
                          {selectedJob.clientAddress.slice(0, 6)}...
                          {selectedJob.clientAddress.slice(-4)}
                        </p>
                      </div>

                      <div>
                        <label className="text-sm text-gray-500">
                          Description
                        </label>
                        <p className="text-gray-300">{selectedJob.description}</p>
                      </div>

                      <div>
                        <label className="text-sm text-gray-500">Created</label>
                        <p className="text-gray-300">
                          {new Date(selectedJob.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Status Actions */}
                    {selectedJob.status !== "completed" &&
                      selectedJob.status !== "cancelled" && (
                        <div className="space-y-3">
                          <label className="text-sm text-gray-500">
                            Update Status
                          </label>
                          <div className="flex gap-2">
                            {selectedJob.status === "pending" && (
                              <button
                                onClick={() =>
                                  handleStatusUpdate(selectedJob.id, "in_progress")
                                }
                                disabled={updatingStatus}
                                className="flex-1 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition"
                              >
                                {updatingStatus ? "Updating..." : "Start Work"}
                              </button>
                            )}
                            {selectedJob.status === "in_progress" && (
                              <button
                                onClick={() =>
                                  handleStatusUpdate(selectedJob.id, "completed")
                                }
                                disabled={updatingStatus}
                                className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:bg-gray-600 text-white py-2 rounded-lg font-medium transition"
                              >
                                {updatingStatus
                                  ? "Updating..."
                                  : "Mark Complete"}
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Earnings Tab */}
          {activeTab === "earnings" && (
            <div>
              <h2 className="text-xl font-bold mb-6">Earnings Summary</h2>

              <div className="bg-white/5 rounded-xl p-6 border border-white/10 mb-6">
                <div className="text-center">
                  <p className="text-gray-400 mb-2">Total Earnings</p>
                  <p className="text-4xl font-bold text-emerald-400">
                    ${totalEarnings.toLocaleString()}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">USDC</p>
                </div>
              </div>

              <h3 className="font-semibold mb-4">Completed Jobs</h3>
              {jobs.filter((j) => j.status === "completed").length === 0 ? (
                <div className="text-center py-8 bg-white/5 rounded-xl border border-white/10">
                  <p className="text-gray-400">No completed jobs yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs
                    .filter((j) => j.status === "completed")
                    .map((job) => (
                      <div
                        key={job.id}
                        className="bg-white/5 rounded-xl p-4 border border-white/10 flex items-center justify-between"
                      >
                        <div>
                          <p className="font-medium">{job.serviceName}</p>
                          <p className="text-sm text-gray-500">
                            {job.completedAt
                              ? new Date(job.completedAt).toLocaleDateString()
                              : new Date(job.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <span className="text-emerald-400 font-semibold">
                          +${job.amount}
                        </span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <DashboardContent />
    </Suspense>
  );
}
