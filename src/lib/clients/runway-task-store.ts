// ===========================================
// RUNWAY TASK STORE
// ===========================================
// In-memory store for tracking Runway generation tasks.
// This persists for the lifetime of the serverless function.
// For production, replace with a database table.
//
// IMPORTANT: This must be in a separate module from the route handlers
// because Next.js does not allow non-standard exports from route files.

import { type RunwayModel, type RunwayRatio } from "@/lib/clients/runway";

export interface RunwayTaskInfo {
  id: string;
  upcomingReleaseId?: string;
  artistName: string;
  title: string;
  model: RunwayModel;
  ratio: RunwayRatio;
  duration: number;
  promptText: string;
  promptImage?: string;
  status: string;
  output?: string[];
  error?: string;
  createdAt: string;
  estimatedCost: { credits: number; usd: number };
}

export const taskStore: Map<string, RunwayTaskInfo> = new Map();
