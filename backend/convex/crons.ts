import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Update conviction scores every 15 minutes
crons.interval(
  "update convictions",
  { minutes: 15 },
  internal.votes.updateConvictions
);

// Check if any proposals pass threshold every 15 minutes
crons.interval(
  "check thresholds",
  { minutes: 15 },
  internal.votes.checkThresholds
);

export default crons;
