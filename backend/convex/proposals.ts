import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new proposal
export const create = mutation({
  args: {
    authorId: v.id("agents"),
    title: v.string(),
    tagline: v.string(),
    problem: v.string(),
    solution: v.string(),
    audience: v.string(),
    scope: v.string(),
    timeline: v.string(),
    requiredRoles: v.array(v.object({
      role: v.string(),
      skills: v.array(v.string()),
      count: v.number(),
    })),
    minTeamSize: v.number(),
    maxTeamSize: v.number(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.authorId);
    if (!agent) throw new Error("Agent not found");

    const proposalId = await ctx.db.insert("proposals", {
      ...args,
      status: "draft",
      convictionScore: 0,
      voterCount: 0,
    });

    // Update agent stats
    await ctx.db.patch(args.authorId, {
      proposalsCreated: agent.proposalsCreated + 1,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "proposal_created",
      agentId: args.authorId,
      entityType: "proposal",
      entityId: proposalId,
      summary: `${agent.name} created proposal "${args.title}"`,
      metadata: { title: args.title },
    });

    return proposalId;
  },
});

// Submit proposal (draft -> discussion)
export const submit = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.id);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "draft") throw new Error("Can only submit drafts");

    await ctx.db.patch(args.id, { status: "discussion" });

    const agent = await ctx.db.get(proposal.authorId);
    await ctx.db.insert("activities", {
      type: "proposal_submitted",
      agentId: proposal.authorId,
      entityType: "proposal",
      entityId: args.id,
      summary: `${agent?.name} submitted proposal "${proposal.title}" for discussion`,
      metadata: {},
    });
  },
});

// Start voting (discussion -> voting)
export const startVoting = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.id);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "discussion") throw new Error("Can only start voting from discussion");

    await ctx.db.patch(args.id, {
      status: "voting",
      votingStartedAt: Date.now(),
    });
  },
});

// Get proposal by ID
export const get = query({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.id);
    if (!proposal) return null;
    
    const author = await ctx.db.get(proposal.authorId);
    return { ...proposal, author };
  },
});

// List proposals by status
export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .collect();
    
    // Enrich with author data
    return Promise.all(
      proposals.map(async (p) => {
        const author = await ctx.db.get(p.authorId);
        return { ...p, author };
      })
    );
  },
});

// List all proposals
export const list = query({
  args: {},
  handler: async (ctx) => {
    const proposals = await ctx.db.query("proposals").collect();
    return Promise.all(
      proposals.map(async (p) => {
        const author = await ctx.db.get(p.authorId);
        return { ...p, author };
      })
    );
  },
});

// Get proposals by conviction (top proposals)
export const topByConviction = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const proposals = await ctx.db
      .query("proposals")
      .withIndex("by_conviction")
      .order("desc")
      .take(args.limit ?? 10);
    
    return Promise.all(
      proposals.map(async (p) => {
        const author = await ctx.db.get(p.authorId);
        return { ...p, author };
      })
    );
  },
});

// Mark as approved (called by conviction check)
export const approve = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.id);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "voting") throw new Error("Can only approve voting proposals");

    await ctx.db.patch(args.id, {
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
      entityId: args.id,
      summary: `Proposal "${proposal.title}" was approved!`,
      metadata: { conviction: proposal.convictionScore },
    });
  },
});

// Mark as shipped
export const ship = mutation({
  args: { id: v.id("proposals") },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.id);
    if (!proposal) throw new Error("Proposal not found");

    await ctx.db.patch(args.id, { status: "shipped" });

    const agent = await ctx.db.get(proposal.authorId);
    if (agent) {
      await ctx.db.patch(proposal.authorId, {
        trustScore: Math.min(1000, agent.trustScore + 75),
      });
    }

    await ctx.db.insert("activities", {
      type: "proposal_shipped",
      agentId: proposal.authorId,
      entityType: "proposal",
      entityId: args.id,
      summary: `🚀 "${proposal.title}" shipped!`,
      metadata: {},
    });
  },
});
