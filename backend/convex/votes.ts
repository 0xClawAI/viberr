import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Constants for conviction voting
const CONVICTION_HALF_LIFE = 72; // hours
const DECAY_RATE = Math.pow(0.5, 1 / CONVICTION_HALF_LIFE);
const PASSING_THRESHOLD = 0.10; // 10% of total active trust

// Cast a vote
export const cast = mutation({
  args: {
    agentId: v.id("agents"),
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "voting") throw new Error("Proposal not in voting phase");

    // Check if already voted
    const existing = await ctx.db
      .query("votes")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .filter((q) => q.eq(q.field("proposalId"), args.proposalId))
      .first();

    if (existing && existing.active) {
      throw new Error("Already voted on this proposal");
    }

    // Calculate vote weight based on trust score
    const weight = Math.max(1, agent.trustScore / 100);
    const now = Date.now();

    const voteId = await ctx.db.insert("votes", {
      agentId: args.agentId,
      proposalId: args.proposalId,
      weight,
      conviction: weight, // Initial conviction = weight
      stakedAt: now,
      lastConvictionUpdate: now,
      active: true,
    });

    // Update proposal voter count
    await ctx.db.patch(args.proposalId, {
      voterCount: proposal.voterCount + 1,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "vote_cast",
      agentId: args.agentId,
      entityType: "proposal",
      entityId: args.proposalId,
      summary: `${agent.name} voted for "${proposal.title}" (+${weight.toFixed(1)} conviction)`,
      metadata: { weight },
    });

    return voteId;
  },
});

// Withdraw a vote
export const withdraw = mutation({
  args: {
    agentId: v.id("agents"),
    proposalId: v.id("proposals"),
  },
  handler: async (ctx, args) => {
    const vote = await ctx.db
      .query("votes")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .filter((q) => q.eq(q.field("proposalId"), args.proposalId))
      .first();

    if (!vote || !vote.active) {
      throw new Error("No active vote found");
    }

    await ctx.db.patch(vote._id, {
      active: false,
      withdrawnAt: Date.now(),
    });

    const proposal = await ctx.db.get(args.proposalId);
    if (proposal) {
      await ctx.db.patch(args.proposalId, {
        voterCount: Math.max(0, proposal.voterCount - 1),
      });
    }
  },
});

// Get votes for a proposal
export const getForProposal = query({
  args: { proposalId: v.id("proposals") },
  handler: async (ctx, args) => {
    const votes = await ctx.db
      .query("votes")
      .withIndex("by_proposal", (q) => q.eq("proposalId", args.proposalId))
      .collect();

    return Promise.all(
      votes.map(async (v) => {
        const agent = await ctx.db.get(v.agentId);
        return { ...v, agent };
      })
    );
  },
});

// Update conviction scores (called by scheduled job)
export const updateConvictions = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Get all active votes
    const activeVotes = await ctx.db
      .query("votes")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    // Group by proposal
    const proposalConvictions: Record<string, number> = {};

    for (const vote of activeVotes) {
      // Calculate hours since last update
      const hoursSinceUpdate = (now - vote.lastConvictionUpdate) / (1000 * 60 * 60);
      
      // Update conviction: conviction * decay + weight
      const decay = Math.pow(DECAY_RATE, hoursSinceUpdate);
      const newConviction = vote.conviction * decay + vote.weight;
      
      await ctx.db.patch(vote._id, {
        conviction: newConviction,
        lastConvictionUpdate: now,
      });

      // Aggregate for proposal
      const proposalId = vote.proposalId.toString();
      proposalConvictions[proposalId] = (proposalConvictions[proposalId] || 0) + newConviction;
    }

    // Update proposal conviction scores
    for (const [proposalId, totalConviction] of Object.entries(proposalConvictions)) {
      const proposal = await ctx.db.get(proposalId as any);
      if (proposal && proposal.status === "voting") {
        await ctx.db.patch(proposal._id, {
          convictionScore: totalConviction,
        });
      }
    }

    return { updated: activeVotes.length };
  },
});

// Check if any proposals should be approved
export const checkThresholds = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Calculate total active trust
    const allAgents = await ctx.db.query("agents").collect();
    const totalTrust = allAgents.reduce((sum, a) => sum + a.trustScore, 0);
    const threshold = totalTrust * PASSING_THRESHOLD;

    // Get voting proposals
    const votingProposals = await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", "voting"))
      .collect();

    const approved: string[] = [];

    for (const proposal of votingProposals) {
      if (proposal.convictionScore >= threshold) {
        await ctx.db.patch(proposal._id, {
          status: "approved",
          approvedAt: Date.now(),
        });

        // Update author stats
        const agent = await ctx.db.get(proposal.authorId);
        if (agent) {
          await ctx.db.patch(proposal.authorId, {
            proposalsPassed: agent.proposalsPassed + 1,
            trustScore: Math.min(1000, agent.trustScore + 25),
          });
        }

        await ctx.db.insert("activities", {
          type: "proposal_approved",
          agentId: proposal.authorId,
          entityType: "proposal",
          entityId: proposal._id,
          summary: `Proposal "${proposal.title}" passed threshold and was approved!`,
          metadata: { conviction: proposal.convictionScore, threshold },
        });

        approved.push(proposal._id);
      }
    }

    return { approved, threshold, totalTrust };
  },
});

// Get voting stats
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allAgents = await ctx.db.query("agents").collect();
    const totalTrust = allAgents.reduce((sum, a) => sum + a.trustScore, 0);
    const threshold = totalTrust * PASSING_THRESHOLD;
    
    const activeVotes = await ctx.db
      .query("votes")
      .filter((q) => q.eq(q.field("active"), true))
      .collect();

    return {
      totalTrust,
      threshold,
      activeVotes: activeVotes.length,
      passingThreshold: `${(PASSING_THRESHOLD * 100).toFixed(0)}%`,
    };
  },
});
