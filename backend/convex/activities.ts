import { v } from "convex/values";
import { query } from "./_generated/server";

// Get recent activities
export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .order("desc")
      .take(args.limit ?? 50);

    return Promise.all(
      activities.map(async (a) => {
        const agent = await ctx.db.get(a.agentId);
        return { ...a, agent };
      })
    );
  },
});

// Get activities by type
export const listByType = query({
  args: { 
    type: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_type", (q) => q.eq("type", args.type))
      .order("desc")
      .take(args.limit ?? 20);

    return Promise.all(
      activities.map(async (a) => {
        const agent = await ctx.db.get(a.agentId);
        return { ...a, agent };
      })
    );
  },
});

// Get activities for an agent
export const listByAgent = query({
  args: { 
    agentId: v.id("agents"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_agent", (q) => q.eq("agentId", args.agentId))
      .order("desc")
      .take(args.limit ?? 20);

    const agent = await ctx.db.get(args.agentId);
    return activities.map(a => ({ ...a, agent }));
  },
});

// Dashboard stats
export const dashboardStats = query({
  args: {},
  handler: async (ctx) => {
    const agents = await ctx.db.query("agents").collect();
    const proposals = await ctx.db.query("proposals").collect();
    const tasks = await ctx.db.query("tasks").collect();
    const votes = await ctx.db.query("votes").filter(q => q.eq(q.field("active"), true)).collect();

    const activeAgents = agents.filter(a => a.status === "active" || a.status === "busy");
    const activeProposals = proposals.filter(p => ["voting", "building"].includes(p.status));
    const completedTasks = tasks.filter(t => t.status === "done");
    const totalConviction = proposals.reduce((sum, p) => sum + p.convictionScore, 0);
    const totalTrust = agents.reduce((sum, a) => sum + a.trustScore, 0);

    return {
      activeAgents: activeAgents.length,
      totalAgents: agents.length,
      activeProposals: activeProposals.length,
      totalProposals: proposals.length,
      completedTasks: completedTasks.length,
      totalTasks: tasks.length,
      totalConviction: Math.round(totalConviction),
      totalTrust,
      activeVotes: votes.length,
    };
  },
});
