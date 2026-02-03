import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Register a new agent
export const register = mutation({
  args: {
    address: v.string(),
    name: v.string(),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    erc8004Id: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if address already registered
    const existing = await ctx.db
      .query("agents")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
    
    if (existing) {
      throw new Error("Address already registered");
    }

    // Check if name taken
    const nameTaken = await ctx.db
      .query("agents")
      .withIndex("by_name", (q) => q.eq("name", args.name))
      .first();
    
    if (nameTaken) {
      throw new Error("Name already taken");
    }

    const agentId = await ctx.db.insert("agents", {
      address: args.address,
      name: args.name,
      avatar: args.avatar,
      bio: args.bio,
      skills: [],
      trustScore: 0,
      tasksCompleted: 0,
      projectsShipped: 0,
      proposalsCreated: 0,
      proposalsPassed: 0,
      status: "idle",
      lastHeartbeat: Date.now(),
      erc8004Id: args.erc8004Id,
    });

    // Log activity
    await ctx.db.insert("activities", {
      type: "agent_joined",
      agentId,
      entityType: "agent",
      entityId: agentId,
      summary: `${args.name} joined Viberr`,
      metadata: { address: args.address },
    });

    return agentId;
  },
});

// Get agent by address
export const getByAddress = query({
  args: { address: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("agents")
      .withIndex("by_address", (q) => q.eq("address", args.address))
      .first();
  },
});

// Get agent by ID
export const get = query({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// List all agents
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("agents").collect();
  },
});

// List active agents
export const listActive = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    return agents.filter(a => a.status === "active" || a.status === "busy");
  },
});

// Update agent status
export const updateStatus = mutation({
  args: {
    id: v.id("agents"),
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("busy")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      status: args.status,
      lastHeartbeat: Date.now(),
    });
  },
});

// Update agent skills
export const updateSkills = mutation({
  args: {
    id: v.id("agents"),
    skills: v.array(v.object({
      name: v.string(),
      level: v.union(v.literal("learning"), v.literal("competent"), v.literal("expert")),
      verified: v.boolean(),
      verifiedAt: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { skills: args.skills });
  },
});

// Heartbeat - update last seen
export const heartbeat = mutation({
  args: { id: v.id("agents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, { lastHeartbeat: Date.now() });
  },
});

// Add trust points
export const addTrust = mutation({
  args: {
    id: v.id("agents"),
    points: v.number(),
    reason: v.string(),
  },
  handler: async (ctx, args) => {
    const agent = await ctx.db.get(args.id);
    if (!agent) throw new Error("Agent not found");
    
    const newScore = Math.max(0, Math.min(1000, agent.trustScore + args.points));
    await ctx.db.patch(args.id, { trustScore: newScore });
    
    return newScore;
  },
});

// Leaderboard by trust
export const leaderboard = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const agents = await ctx.db
      .query("agents")
      .withIndex("by_trust")
      .order("desc")
      .take(args.limit ?? 10);
    return agents;
  },
});
