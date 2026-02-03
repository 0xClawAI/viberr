import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a task
export const create = mutation({
  args: {
    projectId: v.id("projects"),
    createdById: v.id("agents"),
    title: v.string(),
    description: v.string(),
    priority: v.optional(v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    )),
  },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    if (!project) throw new Error("Project not found");

    const agent = await ctx.db.get(args.createdById);
    if (!agent) throw new Error("Agent not found");

    const proposal = await ctx.db.get(project.proposalId);

    const taskId = await ctx.db.insert("tasks", {
      projectId: args.projectId,
      createdById: args.createdById,
      title: args.title,
      description: args.description,
      status: "backlog",
      priority: args.priority ?? "medium",
    });

    await ctx.db.insert("activities", {
      type: "task_created",
      agentId: args.createdById,
      entityType: "task",
      entityId: taskId,
      summary: `${agent.name} created task "${args.title}" for ${proposal?.title}`,
      metadata: { projectId: args.projectId },
    });

    return taskId;
  },
});

// Assign a task
export const assign = mutation({
  args: {
    taskId: v.id("tasks"),
    assigneeId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const agent = await ctx.db.get(args.assigneeId);
    if (!agent) throw new Error("Agent not found");

    await ctx.db.patch(args.taskId, {
      assigneeId: args.assigneeId,
      status: task.status === "backlog" ? "todo" : task.status,
    });

    await ctx.db.insert("activities", {
      type: "task_assigned",
      agentId: args.assigneeId,
      entityType: "task",
      entityId: args.taskId,
      summary: `${agent.name} was assigned "${task.title}"`,
      metadata: {},
    });
  },
});

// Update task status
export const updateStatus = mutation({
  args: {
    taskId: v.id("tasks"),
    status: v.union(
      v.literal("backlog"),
      v.literal("todo"),
      v.literal("in_progress"),
      v.literal("review"),
      v.literal("done")
    ),
    agentId: v.id("agents"),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");

    const agent = await ctx.db.get(args.agentId);
    if (!agent) throw new Error("Agent not found");

    const updates: any = { status: args.status };
    if (args.status === "done") {
      updates.completedAt = Date.now();
    }

    await ctx.db.patch(args.taskId, updates);

    if (args.status === "done") {
      // Award trust
      if (task.assigneeId) {
        const assignee = await ctx.db.get(task.assigneeId);
        if (assignee) {
          await ctx.db.patch(task.assigneeId, {
            tasksCompleted: assignee.tasksCompleted + 1,
            trustScore: Math.min(1000, assignee.trustScore + 10),
          });
        }
      }

      await ctx.db.insert("activities", {
        type: "task_completed",
        agentId: args.agentId,
        entityType: "task",
        entityId: args.taskId,
        summary: `${agent.name} completed "${task.title}"`,
        metadata: {},
      });
    }
  },
});

// Get tasks for a project
export const listByProject = query({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
      .collect();

    return Promise.all(
      tasks.map(async (t) => {
        const assignee = t.assigneeId ? await ctx.db.get(t.assigneeId) : null;
        return { ...t, assignee };
      })
    );
  },
});

// Get tasks by assignee
export const listByAssignee = query({
  args: { agentId: v.id("agents") },
  handler: async (ctx, args) => {
    const tasks = await ctx.db
      .query("tasks")
      .withIndex("by_assignee", (q) => q.eq("assigneeId", args.agentId))
      .collect();

    return Promise.all(
      tasks.map(async (t) => {
        const project = await ctx.db.get(t.projectId);
        return { ...t, project };
      })
    );
  },
});

// Get task counts by status
export const countByStatus = query({
  args: { projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    let tasks;
    if (args.projectId) {
      tasks = await ctx.db
        .query("tasks")
        .withIndex("by_project", (q) => q.eq("projectId", args.projectId))
        .collect();
    } else {
      tasks = await ctx.db.query("tasks").collect();
    }

    return {
      backlog: tasks.filter(t => t.status === "backlog").length,
      todo: tasks.filter(t => t.status === "todo").length,
      in_progress: tasks.filter(t => t.status === "in_progress").length,
      review: tasks.filter(t => t.status === "review").length,
      done: tasks.filter(t => t.status === "done").length,
      total: tasks.length,
    };
  },
});

// Get all tasks grouped by status
export const groupedByStatus = query({
  args: {},
  handler: async (ctx) => {
    const tasks = await ctx.db.query("tasks").collect();
    
    const enriched = await Promise.all(
      tasks.map(async (t) => {
        const assignee = t.assigneeId ? await ctx.db.get(t.assigneeId) : null;
        const project = await ctx.db.get(t.projectId);
        const proposal = project ? await ctx.db.get(project.proposalId) : null;
        return { ...t, assignee, projectName: proposal?.title };
      })
    );

    return {
      backlog: enriched.filter(t => t.status === "backlog"),
      todo: enriched.filter(t => t.status === "todo"),
      in_progress: enriched.filter(t => t.status === "in_progress"),
      review: enriched.filter(t => t.status === "review"),
      done: enriched.filter(t => t.status === "done"),
    };
  },
});
