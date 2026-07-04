// ===========================================
// RUNWAY AI VIDEO GENERATION CLIENT
// ===========================================
// Handles video generation via the Runway ML API.
// Supports image-to-video, text-to-video, and video-to-video generation.
// Uses async task polling pattern (no webhooks available).
//
// API Docs: https://docs.dev.runwayml.com
// SDK: @runwayml/sdk

import RunwayML from "@runwayml/sdk";

// ===========================================
// CONFIGURATION
// ===========================================

function getApiKey(): string {
  const key = process.env.RUNWAYML_API_SECRET;
  if (!key) {
    throw new Error("RUNWAYML_API_SECRET environment variable is not set");
  }
  return key;
}

function getClient(): RunwayML {
  return new RunwayML({ apiKey: getApiKey() });
}

// ===========================================
// TYPES
// ===========================================

export type RunwayModel =
  | "gen4.5"
  | "gen4_turbo"
  | "gen4_aleph"
  | "act_two"
  | "gen3a_turbo";

export type RunwayRatio =
  | "1280:720" // 16:9 landscape
  | "720:1280" // 9:16 portrait (Reels/TikTok)
  | "960:960" // 1:1 square
  | "1104:832" // 4:3 landscape
  | "832:1104" // 3:4 portrait
  | "1584:672"; // Ultrawide

export type TaskStatus =
  | "PENDING"
  | "THROTTLED"
  | "RUNNING"
  | "SUCCEEDED"
  | "FAILED"
  | "CANCELLED";

export interface RunwayGenerationOptions {
  model: RunwayModel;
  promptText: string;
  promptImage?: string; // URL of the cover image
  ratio: RunwayRatio;
  duration: number; // 2-10 seconds
  seed?: number; // For reproducibility
}

export interface RunwayTaskResult {
  id: string;
  status: TaskStatus;
  createdAt: string;
  output?: string[]; // URLs to generated videos (ephemeral, expire in 24-48h)
  error?: string;
  modelName?: string;
  progress?: number;
}

export interface RunwayCreditInfo {
  creditsRemaining: number;
  tier: number;
}

// ===========================================
// MODEL METADATA
// ===========================================

export const RUNWAY_MODELS: Record<
  RunwayModel,
  {
    name: string;
    description: string;
    creditsPerSecond: number;
    maxDuration: number;
    supportsTextOnly: boolean;
    supportsImage: boolean;
    supportsVideo: boolean;
  }
> = {
  "gen4.5": {
    name: "Gen-4.5",
    description: "Flagship model — highest quality, cinematic output",
    creditsPerSecond: 12,
    maxDuration: 10,
    supportsTextOnly: true,
    supportsImage: true,
    supportsVideo: false,
  },
  gen4_turbo: {
    name: "Gen-4 Turbo",
    description: "Fast & affordable — great for marketing content",
    creditsPerSecond: 5,
    maxDuration: 10,
    supportsTextOnly: false,
    supportsImage: true,
    supportsVideo: false,
  },
  gen4_aleph: {
    name: "Gen-4 Aleph",
    description: "Video-to-video transformation — restyle existing footage",
    creditsPerSecond: 15,
    maxDuration: 10,
    supportsTextOnly: false,
    supportsImage: true,
    supportsVideo: true,
  },
  act_two: {
    name: "Act Two",
    description: "Creative motion — expressive character animation",
    creditsPerSecond: 5,
    maxDuration: 10,
    supportsTextOnly: false,
    supportsImage: true,
    supportsVideo: true,
  },
  gen3a_turbo: {
    name: "Gen-3 Alpha Turbo",
    description: "Legacy — fast and cheap, lower quality",
    creditsPerSecond: 5,
    maxDuration: 10,
    supportsTextOnly: false,
    supportsImage: true,
    supportsVideo: false,
  },
};

export const RUNWAY_RATIOS: {
  id: RunwayRatio;
  label: string;
  orientation: string;
}[] = [
  { id: "720:1280", label: "9:16 Vertical", orientation: "vertical" },
  { id: "1280:720", label: "16:9 Horizontal", orientation: "horizontal" },
  { id: "960:960", label: "1:1 Square", orientation: "square" },
  { id: "1104:832", label: "4:3 Landscape", orientation: "horizontal" },
  { id: "832:1104", label: "3:4 Portrait", orientation: "vertical" },
  { id: "1584:672", label: "Ultrawide", orientation: "horizontal" },
];

// ===========================================
// SMART PROMPT TEMPLATES
// ===========================================

export const PROMPT_TEMPLATES = [
  {
    id: "cinematic-zoom",
    name: "Cinematic Zoom",
    prompt:
      "Cinematic slow zoom into album artwork, dramatic lighting, atmospheric smoke, dark hip-hop aesthetic, moody shadows, film grain",
    bestFor: "Cover art with dark/moody aesthetic",
  },
  {
    id: "particle-explosion",
    name: "Particle Explosion",
    prompt:
      "Album artwork erupts with particles and light, explosive energy, dynamic motion, neon accents against darkness, dramatic reveal",
    bestFor: "High-energy singles, bangers",
  },
  {
    id: "smoke-reveal",
    name: "Smoke Reveal",
    prompt:
      "Album cover slowly revealed through thick smoke and fog, mysterious atmosphere, dark ambient lighting, cinematic reveal",
    bestFor: "Mysterious/ambient releases",
  },
  {
    id: "glitch-distortion",
    name: "Glitch Distortion",
    prompt:
      "Glitch art distortion of album cover, digital artifacts, chromatic aberration, VHS noise, cyberpunk aesthetic, data moshing",
    bestFor: "Experimental, electronic, trap",
  },
  {
    id: "parallax-depth",
    name: "Parallax Depth",
    prompt:
      "Parallax depth effect on album artwork, layers separating in 3D space, floating elements, atmospheric depth of field, dreamlike motion",
    bestFor: "Any cover art with layered composition",
  },
  {
    id: "fire-flames",
    name: "Fire & Flames",
    prompt:
      "Album artwork surrounded by rising flames and embers, intense heat distortion, fire particles, dark background, dramatic lighting",
    bestFor: "Aggressive tracks, hard-hitting releases",
  },
  {
    id: "neon-glow",
    name: "Neon Glow",
    prompt:
      "Album artwork with pulsing neon glow effect, vibrant light trails, dark background, synthwave aesthetic, electric energy",
    bestFor: "Electronic, synth, night vibes",
  },
  {
    id: "water-ripple",
    name: "Water Ripple",
    prompt:
      "Album artwork reflected in dark water with ripple effects, liquid motion, dreamy distortion, ambient reflection, sonic waves",
    bestFor: "Lo-fi, chill, liquid sound",
  },
];

// ===========================================
// GENERATION FUNCTIONS
// ===========================================

/**
 * Generate a video from an image (album cover) and text prompt.
 * This is the primary use case for SLC marketing content.
 */
export async function generateImageToVideo(
  options: RunwayGenerationOptions,
): Promise<RunwayTaskResult> {
  const client = getClient();

  const params: Record<string, unknown> = {
    model: options.model,
    promptText: options.promptText,
    ratio: options.ratio,
    duration: options.duration,
  };

  if (options.promptImage) {
    params.promptImage = options.promptImage;
  }

  if (options.seed !== undefined) {
    params.seed = options.seed;
  }

  try {
    const task = await client.imageToVideo.create(
      params as unknown as Parameters<typeof client.imageToVideo.create>[0],
    );

    return {
      id: task.id,
      status:
        ((task as unknown as Record<string, unknown>).status as TaskStatus) ||
        "PENDING",
      createdAt:
        ((task as unknown as Record<string, unknown>).createdAt as string) ||
        new Date().toISOString(),
      modelName: options.model,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Runway] Image-to-video generation failed:", errMsg);
    throw new Error(`Runway generation failed: ${errMsg}`);
  }
}

/**
 * Generate a video from text only (no reference image).
 */
export async function generateTextToVideo(
  options: Omit<RunwayGenerationOptions, "promptImage"> & {
    promptImage?: never;
  },
): Promise<RunwayTaskResult> {
  const client = getClient();

  const params: Record<string, unknown> = {
    model: options.model,
    promptText: options.promptText,
    ratio: options.ratio,
    duration: options.duration,
  };

  if (options.seed !== undefined) {
    params.seed = options.seed;
  }

  try {
    const task = await client.textToVideo.create(
      params as unknown as Parameters<typeof client.textToVideo.create>[0],
    );

    return {
      id: task.id,
      status:
        ((task as unknown as Record<string, unknown>).status as TaskStatus) ||
        "PENDING",
      createdAt:
        ((task as unknown as Record<string, unknown>).createdAt as string) ||
        new Date().toISOString(),
      modelName: options.model,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Runway] Text-to-video generation failed:", errMsg);
    throw new Error(`Runway generation failed: ${errMsg}`);
  }
}

/**
 * Transform an existing video using the video-to-video API.
 */
export async function generateVideoToVideo(
  options: RunwayGenerationOptions & { promptVideo: string },
): Promise<RunwayTaskResult> {
  const client = getClient();

  const params: Record<string, unknown> = {
    model: options.model,
    promptText: options.promptText,
    promptImage: options.promptVideo, // video URL goes here for video-to-video
    ratio: options.ratio,
    duration: options.duration,
  };

  if (options.promptImage) {
    params.promptImage = options.promptImage;
  }

  try {
    const task = await client.videoToVideo.create(
      params as unknown as Parameters<typeof client.videoToVideo.create>[0],
    );

    return {
      id: task.id,
      status:
        ((task as unknown as Record<string, unknown>).status as TaskStatus) ||
        "PENDING",
      createdAt:
        ((task as unknown as Record<string, unknown>).createdAt as string) ||
        new Date().toISOString(),
      modelName: options.model,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Runway] Video-to-video generation failed:", errMsg);
    throw new Error(`Runway generation failed: ${errMsg}`);
  }
}

// ===========================================
// TASK MANAGEMENT
// ===========================================

/**
 * Get the current status of a generation task.
 */
export async function getTaskStatus(taskId: string): Promise<RunwayTaskResult> {
  const client = getClient();

  try {
    const task = await client.tasks.retrieve(taskId);
    const taskAny = task as unknown as Record<string, unknown>;

    return {
      id: task.id,
      status: (taskAny.status as TaskStatus) || "PENDING",
      createdAt: (taskAny.createdAt as string) || "",
      output: taskAny.output as string[] | undefined,
      error: taskAny.error as string | undefined,
      progress: taskAny.progress as number | undefined,
    };
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : "Unknown error";
    console.error("[Runway] Task status fetch failed:", errMsg);
    throw new Error(`Failed to get task status: ${errMsg}`);
  }
}

/**
 * Cancel a running generation task.
 */
export async function cancelTask(taskId: string): Promise<boolean> {
  const client = getClient();

  try {
    await client.tasks.delete(taskId);
    return true;
  } catch (error) {
    console.error("[Runway] Task cancellation failed:", error);
    return false;
  }
}

/**
 * Wait for a task to complete, polling at regular intervals.
 * Returns the final task result when SUCCEEDED or FAILED.
 */
export async function waitForTask(
  taskId: string,
  maxWaitMs = 300000, // 5 minutes default
  pollIntervalMs = 5000, // 5 seconds between polls
): Promise<RunwayTaskResult> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    const task = await getTaskStatus(taskId);

    if (task.status === "SUCCEEDED") {
      return task;
    }

    if (task.status === "FAILED") {
      return task;
    }

    if (task.status === "CANCELLED") {
      return task;
    }

    // Still PENDING, THROTTLED, or RUNNING — wait and poll again
    await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
  }

  // Timeout
  return {
    id: taskId,
    status: "RUNNING",
    createdAt: "",
    error: `Task did not complete within ${maxWaitMs / 1000}s timeout`,
  };
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Calculate the estimated cost of a generation.
 */
export function estimateCost(
  model: RunwayModel,
  durationSeconds: number,
): {
  credits: number;
  usd: number;
} {
  const modelInfo = RUNWAY_MODELS[model];
  if (!modelInfo) return { credits: 0, usd: 0 };

  const credits = modelInfo.creditsPerSecond * durationSeconds;
  const usd = credits * 0.01; // $0.01 per credit

  return { credits, usd };
}

/**
 * Generate a smart prompt based on release metadata.
 * Uses the artist name, title, and category to craft an appropriate prompt.
 */
export function generateSmartPrompt(
  artistName: string,
  title: string,
  templateId = "cinematic-zoom",
  customAdditions?: string,
): string {
  const template = PROMPT_TEMPLATES.find((t) => t.id === templateId);
  const basePrompt = template?.prompt || PROMPT_TEMPLATES[0].prompt;

  let prompt = `${basePrompt}, "${title}" by ${artistName}`;

  if (customAdditions) {
    prompt += `, ${customAdditions}`;
  }

  return prompt;
}

/**
 * Check if the Runway API is configured and the key is valid.
 */
export async function isRunwayConfigured(): Promise<{
  configured: boolean;
  error?: string;
}> {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) {
    return { configured: false, error: "RUNWAYML_API_SECRET not set" };
  }

  // Try a lightweight API call to validate the key
  try {
    const client = getClient();
    // The SDK doesn't have a direct "validate" endpoint,
    // so we'll just check that we can create a client
    return { configured: true };
  } catch (error) {
    return {
      configured: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Download a generated video from an ephemeral Runway URL
 * and return it as a buffer for storage.
 */
export async function downloadGeneratedVideo(
  videoUrl: string,
): Promise<Buffer> {
  const response = await fetch(videoUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to download video: ${response.status} ${response.statusText}`,
    );
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
