import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create project from approved proposal
export const create = mutation({
  args: {
    proposalId: v.id("proposals"),
    teamLeadId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const proposal = await ctx.db.get(args.proposalId);
    if (!proposal) throw new Error("Proposal not found");
    if (proposal.status !== "approved") throw new Error("Proposal must be approved");

    const agent = await ctx.db.get(args.teamLeadId);
    if (!agent) throw new Error("Agent not found");

    const projectId = await ctx.db.insert("projects", {
      proposalId: args.proposalId,
      teamLeadId: args.teamLeadId,
      members: [{
        agentId: args.teamLeadId,
        role: "Lead",
        joinedAt: Date.now(),
        contributionScore: 0,
      }],
      status: "forming",
    });

    // Update proposal
    await ctx.db.patch(args.proposalId, {
      status: "building",
      projectId,
    });

    // Update agent
    await ctx.db.patch(args.teamLeadId, {
      status: "active",
      currentProjectId: projectId,
    });

    await ctx.db.insert("activities", {
      type: "project_started",
      agentId: args.teamLeadId,
      entityType: "project",
      entityId: projectId,
      summary: `${agent.name} started building "${proposal.title}"`,
      metadata: { proposalId: args.proposalId },
    });

    return projectId;
  },
});

// Join a project
export const join = mutation({
  args: {
    projectId: v.id("projects"),
    agentId: v.id("agents"),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");
    
    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    // Check if already a member
    if (project.members.some(m => m.agentId === args.agentId)) {
      throw new Error("Already a team member");
    }

    const proposal = await ctx.db.get(project.proposalId);
    if (proposal && project.members.length >= proposal.maxTeamSize) {
      throw new Error("Team is full");
    }

    await ctx.db.patch(args.projectId, {
      members: [...project.members, {
        agentId: args.agentId,
        role: args.role,
        joinedAt: Date.now(),
        contributionScore: 0,
      }],
    });

    await ctx.db.patch(args.agentId, {
      status: "active",
      currentProjectId: args.projectId,
    });

    await ctx.db.insert("activities", {
      type: "member_joined",
      agentId: args.agentId,
      entityType: "project",
      entityId: args.projectId,
      summary: `${agent.name} joined team for "${proposal?.title}"`,
      metadata: { role: args.role },
    });
  },
});

// Leave a project
export const leave = mutation({
  args: {
    projectId: v.id("projects"),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    // Can't leave if team lead
    if (project.teamLeadId === args.agentId) {
      throw new Error("Team lead cannot leave. Transfer leadership first.");
    }

    await ctx.db.patch(args.projectId, {
      members: project.members.filter(m => m.agentId !== args.agentId),
    });

    await ctx.db.patch(args.agentId, {
      status: "idle",
      currentProjectId: undefined,
    });

    await ctx.db.insert("activities", {
      type: "member_left",
      agentId: args.agentId,
      entityType: "project",
      entityId: args.projectId,
      summary: `${agent.name} left the team`,
      metadata: {},
    });
  },
});

// Ship a project
export const ship = mutation({
  args: {
    projectId: v.id("projects"),
    repoUrl: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    await ctx.db.patch(args.projectId, {
      status: "shipped",
      shippedAt: Date.now(),
      repoUrl: args.repoUrl,
      demoUrl: args.demoUrl,
      description: args.description,
    });

    // Update proposal status
    const proposal = await ctx.db.get(project.proposalId);
    if (proposal) {
      await ctx.db.patch(project.proposalId, { status: "shipped" });
    }

    // Award trust to all members
    for (const member of project.members) {
      const agent = await ctx.db.get(member.agentId);
      if (agent) {
        const trustGain = member.agentId === project.teamLeadId ? 100 : 50;
        await ctx.db.patch(member.agentId, {
          projectsShipped: agent.projectsShipped + 1,
          trustScore: Math.min(1000, agent.trustScore + trustGain),
          status: "idle",
          currentProjectId: undefined,
        });
      }
    }

    const lead = await ctx.db.get(project.teamLeadId);
    await ctx.db.insert("activities", {
      type: "project_shipped",
      agentId: project.teamLeadId,
      entityType: "project",
      entityId: args.projectId,
      summary: `🚀 "${proposal?.title}" shipped by ${lead?.name} and team!`,
      metadata: { members: project.members.length },
    });
  },
});

// Get project by ID
export const get = query({
  args: { id: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.id);
    if (!project) return null;

    const proposal = await ctx.db.get(project.proposalId);
    const lead = await ctx.db.get(project.teamLeadId);
    
    const members = await Promise.all(
      project.members.map(async (m) => {
        const agent = await ctx.db.get(m.agentId);
        return { ...m, agent };
      })
    );

    return { ...project, proposal, lead, members };
  },
});

// List projects by status
export const listByStatus = query({
  args: { status: v.string() },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .withIndex("by_status", (q) => q.eq("status", args.status as any))
      .collect();

    return Promise.all(
      projects.map(async (p) => {
        const proposal = await ctx.db.get(p.proposalId);
        const lead = await ctx.db.get(p.teamLeadId);
        return { ...p, proposal, lead };
      })
    );
  },
});

// List all projects
export const list = query({
  args: {},
  handler: async (ctx) => {
    const projects = await ctx.db.query("projects").collect();
    return Promise.all(
      projects.map(async (p) => {
        const proposal = await ctx.db.get(p.proposalId);
        const lead = await ctx.db.get(p.teamLeadId);
        return { ...p, proposal, lead };
      })
    );
  },
});
