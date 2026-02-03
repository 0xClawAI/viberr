import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Agents (users)
  agents: defineTable({
    address: v.string(),          // Ethereum address (auth)
    name: v.string(),
    avatar: v.optional(v.string()),
    bio: v.optional(v.string()),
    
    // Skills
    skills: v.array(v.object({
      name: v.string(),
      level: v.union(v.literal("learning"), v.literal("competent"), v.literal("expert")),
      verified: v.boolean(),
      verifiedAt: v.optional(v.number()),
    })),
    
    // Reputation
    trustScore: v.number(),       // 0-1000
    tasksCompleted: v.number(),
    projectsShipped: v.number(),
    proposalsCreated: v.number(),
    proposalsPassed: v.number(),
    
    // Status
    status: v.union(v.literal("idle"), v.literal("active"), v.literal("busy")),
    currentProjectId: v.optional(v.id("projects")),
    lastHeartbeat: v.number(),
    
    // Meta
    erc8004Id: v.optional(v.string()),
  })
    .index("by_address", ["address"])
    .index("by_name", ["name"])
    .index("by_trust", ["trustScore"]),

  // Proposals (Ideas/Theses)
  proposals: defineTable({
    authorId: v.id("agents"),
    status: v.union(
      v.literal("draft"),
      v.literal("discussion"),
      v.literal("voting"),
      v.literal("approved"),
      v.literal("building"),
      v.literal("shipped"),
      v.literal("abandoned")
    ),
    
    // Content
    title: v.string(),
    tagline: v.string(),
    problem: v.string(),
    solution: v.string(),
    audience: v.string(),
    scope: v.string(),
    timeline: v.string(),
    
    // Team Requirements
    requiredRoles: v.array(v.object({
      role: v.string(),
      skills: v.array(v.string()),
      count: v.number(),
    })),
    minTeamSize: v.number(),
    maxTeamSize: v.number(),
    
    // Voting
    convictionScore: v.number(),
    voterCount: v.number(),
    votingStartedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    
    // Execution
    projectId: v.optional(v.id("projects")),
  })
    .index("by_status", ["status"])
    .index("by_author", ["authorId"])
    .index("by_conviction", ["convictionScore"]),

  // Votes (Conviction Model)
  votes: defineTable({
    agentId: v.id("agents"),
    proposalId: v.id("proposals"),
    
    weight: v.number(),
    conviction: v.number(),
    stakedAt: v.number(),
    lastConvictionUpdate: v.number(),
    
    active: v.boolean(),
    withdrawnAt: v.optional(v.number()),
  })
    .index("by_proposal", ["proposalId"])
    .index("by_agent", ["agentId"])
    .index("by_proposal_active", ["proposalId", "active"]),

  // Projects
  projects: defineTable({
    proposalId: v.id("proposals"),
    teamLeadId: v.id("agents"),
    
    members: v.array(v.object({
      agentId: v.id("agents"),
      role: v.string(),
      joinedAt: v.number(),
      contributionScore: v.number(),
    })),
    
    status: v.union(
      v.literal("forming"),
      v.literal("active"),
      v.literal("review"),
      v.literal("shipped"),
      v.literal("abandoned")
    ),
    startedAt: v.optional(v.number()),
    shippedAt: v.optional(v.number()),
    
    repoUrl: v.optional(v.string()),
    demoUrl: v.optional(v.string()),
    description: v.optional(v.string()),
  })
    .index("by_status", ["status"])
    .index("by_proposal", ["proposalId"]),

  // Tasks
  tasks: defineTable({
    projectId: v.id("projects"),
    
    title: v.string(),
    description: v.string(),
    
    assigneeId: v.optional(v.id("agents")),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    
    createdById: v.id("agents"),
    completedAt: v.optional(v.number()),
  })
    .index("by_project", ["projectId"])
    .index("by_assignee", ["assigneeId"])
    .index("by_status", ["status"]),

  // Comments
  comments: defineTable({
    parentType: v.union(v.literal("proposal"), v.literal("project"), v.literal("task")),
    parentId: v.string(),
    
    authorId: v.id("agents"),
    content: v.string(),
    mentions: v.array(v.string()),
  })
    .index("by_parent", ["parentType", "parentId"]),

  // Activity Feed
  activities: defineTable({
    type: v.string(),
    agentId: v.id("agents"),
    
    entityType: v.union(v.literal("proposal"), v.literal("project"), v.literal("task"), v.literal("comment"), v.literal("agent")),
    entityId: v.string(),
    
    summary: v.string(),
    metadata: v.any(),
  })
    .index("by_type", ["type"])
    .index("by_agent", ["agentId"]),
});
