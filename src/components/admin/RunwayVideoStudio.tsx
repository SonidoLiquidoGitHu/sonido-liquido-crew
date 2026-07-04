"use client";

import { Button } from "@/components/ui/button";
import {
  PROMPT_TEMPLATES,
  RUNWAY_MODELS,
  RUNWAY_RATIOS,
  type RunwayModel,
  type RunwayRatio,
} from "@/lib/clients/runway";
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  Download,
  ExternalLink,
  Eye,
  Loader2,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  Settings,
  Smartphone,
  Sparkles,
  Square,
  Trash2,
  Video,
  Wand2,
  X,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ============================================
// TYPES
// ============================================

interface RunwayTask {
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

interface RunwayVideoStudioProps {
  coverImageUrl: string;
  artistName: string;
  title: string;
  releaseDate?: string;
  upcomingReleaseId?: string;
  onVideoGenerated?: (videoUrl: string) => void;
  className?: string;
}

type GenerationTab = "quick" | "custom" | "queue";

// ============================================
// COMPONENT
// ============================================

export function RunwayVideoStudio({
  coverImageUrl,
  artistName,
  title,
  releaseDate,
  upcomingReleaseId,
  onVideoGenerated,
  className = "",
}: RunwayVideoStudioProps) {
  // State
  const [activeTab, setActiveTab] = useState<GenerationTab>("quick");
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<RunwayTask[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Quick generate options
  const [quickTemplate, setQuickTemplate] = useState("cinematic-zoom");
  const [quickRatio, setQuickRatio] = useState<RunwayRatio>("720:1280");

  // Custom generate options
  const [customModel, setCustomModel] = useState<RunwayModel>("gen4_turbo");
  const [customRatio, setCustomRatio] = useState<RunwayRatio>("720:1280");
  const [customDuration, setCustomDuration] = useState(5);
  const [customPrompt, setCustomPrompt] = useState("");
  const [customTemplate, setCustomTemplate] = useState("cinematic-zoom");

  // Polling
  const pollingRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRef.current.forEach((timeout) => clearInterval(timeout));
    };
  }, []);

  // Fetch existing tasks
  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/runway/generate");
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch {
      // Silently fail
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  // Poll a task until it completes
  const startPolling = useCallback(
    (taskId: string) => {
      if (pollingRef.current.has(taskId)) return;

      const poll = async () => {
        try {
          const res = await fetch(`/api/admin/runway/tasks/${taskId}`);
          const data = await res.json();

          if (data.success) {
            const task = data.data;

            setTasks((prev) =>
              prev.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      status: task.status,
                      output: task.output,
                      error: task.error,
                    }
                  : t,
              ),
            );

            if (
              task.status === "SUCCEEDED" ||
              task.status === "FAILED" ||
              task.status === "CANCELLED"
            ) {
              // Stop polling
              const timeout = pollingRef.current.get(taskId);
              if (timeout) {
                clearInterval(timeout);
                pollingRef.current.delete(taskId);
              }

              // If succeeded, notify parent
              if (
                task.status === "SUCCEEDED" &&
                task.output &&
                task.output[0]
              ) {
                onVideoGenerated?.(task.output[0]);
              }
            }
          }
        } catch {
          // Continue polling on network errors
        }
      };

      // Poll every 5 seconds
      const timeout = setInterval(poll, 5000);
      pollingRef.current.set(taskId, timeout);

      // Also poll immediately
      poll();
    },
    [onVideoGenerated],
  );

  // Quick generate
  const handleQuickGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      const template = PROMPT_TEMPLATES.find((t) => t.id === quickTemplate);
      const promptText = template
        ? `${template.prompt}, "${title}" by ${artistName}`
        : `Cinematic zoom into album artwork "${title}" by ${artistName}, dramatic lighting, atmospheric`;

      const res = await fetch("/api/admin/runway/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gen4_turbo",
          promptText,
          promptImage: coverImageUrl,
          ratio: quickRatio,
          duration: 5,
          artistName,
          title,
          upcomingReleaseId,
          templateId: quickTemplate,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      // Add to tasks and start polling
      const newTask: RunwayTask = {
        id: data.data.taskId,
        upcomingReleaseId,
        artistName,
        title,
        model: "gen4_turbo",
        ratio: quickRatio,
        duration: 5,
        promptText,
        promptImage: coverImageUrl,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        estimatedCost: data.data.estimatedCost,
      };

      setTasks((prev) => [newTask, ...prev]);
      startPolling(data.data.taskId);
      setActiveTab("queue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar video");
    } finally {
      setIsGenerating(false);
    }
  };

  // Custom generate
  const handleCustomGenerate = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      if (!customPrompt.trim()) {
        throw new Error("El prompt es requerido");
      }

      const res = await fetch("/api/admin/runway/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: customModel,
          promptText: customPrompt,
          promptImage: coverImageUrl,
          ratio: customRatio,
          duration: customDuration,
          artistName,
          title,
          upcomingReleaseId,
          templateId: customTemplate,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      const newTask: RunwayTask = {
        id: data.data.taskId,
        upcomingReleaseId,
        artistName,
        title,
        model: customModel,
        ratio: customRatio,
        duration: customDuration,
        promptText: customPrompt,
        promptImage: coverImageUrl,
        status: "PENDING",
        createdAt: new Date().toISOString(),
        estimatedCost: data.data.estimatedCost,
      };

      setTasks((prev) => [newTask, ...prev]);
      startPolling(data.data.taskId);
      setActiveTab("queue");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al generar video");
    } finally {
      setIsGenerating(false);
    }
  };

  // Cancel a task
  const handleCancelTask = async (taskId: string) => {
    try {
      await fetch(`/api/admin/runway/tasks/${taskId}`, { method: "DELETE" });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: "CANCELLED" } : t)),
      );
      const timeout = pollingRef.current.get(taskId);
      if (timeout) {
        clearInterval(timeout);
        pollingRef.current.delete(taskId);
      }
    } catch {
      // Silently fail
    }
  };

  // Download video from output URL
  const handleDownload = (url: string, taskId: string) => {
    const a = document.createElement("a");
    a.href = url;
    a.download = `${artistName.toLowerCase().replace(/\s+/g, "-")}-${title.toLowerCase().replace(/\s+/g, "-")}-runway-${taskId}.mp4`;
    a.target = "_blank";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Estimate cost for current settings
  const getModelInfo = (model: RunwayModel) => RUNWAY_MODELS[model];
  const estimateCurrentCost = () => {
    const model = activeTab === "quick" ? "gen4_turbo" : customModel;
    const duration = activeTab === "quick" ? 5 : customDuration;
    const info = getModelInfo(model);
    if (!info) return { credits: 0, usd: 0 };
    const credits = info.creditsPerSecond * duration;
    return { credits, usd: credits * 0.01 };
  };

  const cost = estimateCurrentCost();

  // Status badge
  const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, string> = {
      PENDING: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      THROTTLED: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      RUNNING: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      SUCCEEDED: "bg-green-500/10 text-green-500 border-green-500/20",
      FAILED: "bg-red-500/10 text-red-400 border-red-500/20",
      CANCELLED: "bg-gray-500/10 text-gray-400 border-gray-500/20",
    };

    const labels: Record<string, string> = {
      PENDING: "En cola",
      THROTTLED: "Esperando",
      RUNNING: "Generando",
      SUCCEEDED: "Completado",
      FAILED: "Fallido",
      CANCELLED: "Cancelado",
    };

    return (
      <span
        className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
          styles[status] || styles.PENDING
        }`}
      >
        {labels[status] || status}
      </span>
    );
  };

  // Active tasks (still generating)
  const activeTasks = tasks.filter(
    (t) =>
      t.status === "PENDING" ||
      t.status === "THROTTLED" ||
      t.status === "RUNNING",
  );

  const completedTasks = tasks.filter(
    (t) =>
      t.status === "SUCCEEDED" ||
      t.status === "FAILED" ||
      t.status === "CANCELLED",
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald text-xl uppercase flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            AI Video Studio
            <span className="text-xs font-normal text-slc-muted font-sans normal-case">
              Powered by Runway
            </span>
          </h3>
          <p className="text-sm text-slc-muted mt-1">
            Genera videos con IA a partir de la portada del lanzamiento
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1">
        {[
          { id: "quick" as const, label: "Quick Generate", icon: Zap },
          { id: "custom" as const, label: "Custom", icon: Settings },
          {
            id: "queue" as const,
            label: `Queue${activeTasks.length > 0 ? ` (${activeTasks.length})` : ""}`,
            icon: Clock,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-primary text-white"
                  : "bg-slc-card text-slc-muted hover:text-white hover:bg-slc-card/80"
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Quick Generate Tab */}
      {activeTab === "quick" && (
        <div className="space-y-4">
          <div className="p-4 bg-slc-dark rounded-xl border border-slc-border space-y-4">
            {/* Preview of cover image */}
            {coverImageUrl && (
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-lg overflow-hidden bg-black flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={coverImageUrl}
                    alt="Cover"
                    className="w-full h-full object-cover"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{artistName}</p>
                  <p className="text-sm text-slc-muted truncate">{title}</p>
                  <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Cover image ready for AI generation
                  </p>
                </div>
              </div>
            )}

            {/* Template selection */}
            <div>
              <label className="block text-sm text-slc-muted mb-2">
                Style Template
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PROMPT_TEMPLATES.slice(0, 8).map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setQuickTemplate(template.id)}
                    className={`p-2 rounded-lg border text-left transition-all text-xs ${
                      quickTemplate === template.id
                        ? "bg-primary/10 border-primary"
                        : "bg-slc-card border-slc-border hover:border-primary/50"
                    }`}
                  >
                    <span className="font-medium block">{template.name}</span>
                    <span className="text-slc-muted line-clamp-2 mt-0.5">
                      {template.bestFor}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Orientation */}
            <div>
              <label className="block text-sm text-slc-muted mb-2">
                Orientation
              </label>
              <div className="flex gap-2">
                {RUNWAY_RATIOS.slice(0, 3).map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setQuickRatio(r.id)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                      quickRatio === r.id
                        ? "bg-primary border-primary text-white"
                        : "bg-slc-card border-slc-border text-slc-muted hover:text-white"
                    }`}
                  >
                    {r.orientation === "vertical" ? (
                      <Smartphone className="w-4 h-4" />
                    ) : r.orientation === "horizontal" ? (
                      <Monitor className="w-4 h-4" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Cost estimate */}
            <div className="flex items-center justify-between p-3 bg-slc-card rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-slc-muted">Estimated cost:</span>
                <span className="font-medium">${cost.usd.toFixed(2)}</span>
                <span className="text-slc-muted">({cost.credits} credits)</span>
              </div>
              <span className="text-xs text-slc-muted">
                5 sec • Gen-4 Turbo
              </span>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleQuickGenerate}
              disabled={isGenerating || !coverImageUrl}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 mr-2" />
                  Generate AI Video
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Custom Tab */}
      {activeTab === "custom" && (
        <div className="space-y-4">
          <div className="p-4 bg-slc-dark rounded-xl border border-slc-border space-y-4">
            {/* Model selection */}
            <div>
              <label className="block text-sm text-slc-muted mb-2">Model</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {Object.entries(RUNWAY_MODELS).map(([id, info]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setCustomModel(id as RunwayModel)}
                    disabled={!info.supportsImage && !!coverImageUrl}
                    className={`p-3 rounded-lg border text-left transition-all ${
                      customModel === id
                        ? "bg-primary/10 border-primary"
                        : "bg-slc-card border-slc-border hover:border-primary/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{info.name}</span>
                      <span className="text-xs text-green-500">
                        ${info.creditsPerSecond}/sec
                      </span>
                    </div>
                    <p className="text-xs text-slc-muted mt-1">
                      {info.description}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Prompt template quick-fill */}
            <div>
              <label className="block text-sm text-slc-muted mb-2">
                Prompt Template (optional)
              </label>
              <select
                value={customTemplate}
                onChange={(e) => {
                  setCustomTemplate(e.target.value);
                  const template = PROMPT_TEMPLATES.find(
                    (t) => t.id === e.target.value,
                  );
                  if (template) {
                    setCustomPrompt(
                      `${template.prompt}, "${title}" by ${artistName}`,
                    );
                  }
                }}
                className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
              >
                <option value="">Select a template...</option>
                {PROMPT_TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} — {t.bestFor}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom prompt */}
            <div>
              <label className="block text-sm text-slc-muted mb-2">
                Custom Prompt <span className="text-red-400">*</span>
              </label>
              <textarea
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                placeholder={`Describe the video you want to generate for "${title}" by ${artistName}...`}
                className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary resize-none"
              />
              <p className="text-xs text-slc-muted mt-1">
                Be descriptive: mention camera movements, lighting, effects,
                mood. Include the artist name and title for best results.
              </p>
            </div>

            {/* Ratio and Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slc-muted mb-2">
                  Aspect Ratio
                </label>
                <select
                  value={customRatio}
                  onChange={(e) =>
                    setCustomRatio(e.target.value as RunwayRatio)
                  }
                  className="w-full px-3 py-2 bg-slc-card border border-slc-border rounded-lg text-sm focus:outline-none focus:border-primary"
                >
                  {RUNWAY_RATIOS.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-2">
                  Duration: {customDuration}s
                </label>
                <input
                  type="range"
                  min={2}
                  max={10}
                  value={customDuration}
                  onChange={(e) => setCustomDuration(Number(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-slc-muted mt-1">
                  <span>2s</span>
                  <span>10s</span>
                </div>
              </div>
            </div>

            {/* Cost estimate */}
            <div className="flex items-center justify-between p-3 bg-slc-card rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <DollarSign className="w-4 h-4 text-green-500" />
                <span className="text-slc-muted">Estimated cost:</span>
                <span className="font-medium">${cost.usd.toFixed(2)}</span>
                <span className="text-slc-muted">({cost.credits} credits)</span>
              </div>
              <span className="text-xs text-slc-muted">
                {customDuration}s • {RUNWAY_MODELS[customModel]?.name}
              </span>
            </div>

            {/* Generate button */}
            <Button
              onClick={handleCustomGenerate}
              disabled={isGenerating || !customPrompt.trim()}
              className="w-full"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-5 h-5 mr-2" />
                  Generate Custom Video
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Active tasks */}
          {activeTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                Active Generations ({activeTasks.length})
              </h4>
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="p-3 bg-blue-500/5 border border-blue-500/20 rounded-lg"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.status} />
                      <span className="text-sm font-medium">
                        {task.artistName} — {task.title}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCancelTask(task.id)}
                      className="text-red-400 hover:text-red-300 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Cancel
                    </button>
                  </div>
                  <p className="text-xs text-slc-muted line-clamp-1">
                    {task.promptText}
                  </p>
                  <div className="flex items-center gap-3 mt-2 text-xs text-slc-muted">
                    <span>{RUNWAY_MODELS[task.model]?.name}</span>
                    <span>{task.duration}s</span>
                    <span>
                      {RUNWAY_RATIOS.find((r) => r.id === task.ratio)?.label}
                    </span>
                    <span>${task.estimatedCost.usd.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Completed tasks */}
          {completedTasks.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slc-muted">
                Completed ({completedTasks.length})
              </h4>
              {completedTasks.map((task) => (
                <div
                  key={task.id}
                  className={`p-3 rounded-lg border ${
                    task.status === "SUCCEEDED"
                      ? "bg-green-500/5 border-green-500/20"
                      : "bg-red-500/5 border-red-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <StatusBadge status={task.status} />
                      <span className="text-sm font-medium">
                        {task.artistName} — {task.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {task.status === "SUCCEEDED" &&
                        task.output &&
                        task.output[0] && (
                          <>
                            <button
                              type="button"
                              onClick={() =>
                                onVideoGenerated?.(task.output?.[0] || "")
                              }
                              className="text-xs text-primary hover:underline flex items-center gap-1"
                            >
                              <Video className="w-3 h-3" />
                              Use in Generator
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleDownload(task.output?.[0] || "", task.id)
                              }
                              className="text-xs text-green-500 hover:underline flex items-center gap-1"
                            >
                              <Download className="w-3 h-3" />
                              Download
                            </button>
                          </>
                        )}
                    </div>
                  </div>

                  {task.status === "SUCCEEDED" &&
                    task.output &&
                    task.output[0] && (
                      <div className="mt-2 rounded-lg overflow-hidden bg-black max-h-[200px]">
                        <video
                          src={task.output[0]}
                          controls
                          className="w-full max-h-[200px] object-contain"
                        />
                      </div>
                    )}

                  {task.status === "FAILED" && (
                    <div className="mt-2 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                      <p className="text-xs text-red-400 font-medium">Error:</p>
                      <p className="text-xs text-red-400/80 mt-0.5">
                        {task.error ||
                          "Error desconocido — Runway no proporcionó detalles"}
                      </p>
                      <p className="text-xs text-red-400/50 mt-1">
                        Causas comunes: URL de imagen inaccesible, créditos
                        insuficientes, o filtro de contenido. Intenta con otra
                        plantilla o verifica tu cuenta en runwayml.com
                      </p>
                    </div>
                  )}

                  <p className="text-xs text-slc-muted line-clamp-1 mt-2">
                    {task.promptText}
                  </p>

                  <div className="flex items-center gap-3 mt-1 text-xs text-slc-muted">
                    <span>{RUNWAY_MODELS[task.model]?.name}</span>
                    <span>{task.duration}s</span>
                    <span>${task.estimatedCost.usd.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {tasks.length === 0 && (
            <div className="p-8 text-center bg-slc-dark rounded-xl border border-slc-border">
              <Video className="w-12 h-12 text-slc-muted mx-auto mb-3" />
              <p className="text-slc-muted">No generations yet</p>
              <p className="text-sm text-slc-muted mt-1">
                Use Quick Generate or Custom to create your first AI video
              </p>
            </div>
          )}

          {/* Refresh button */}
          <div className="flex justify-center">
            <Button variant="ghost" size="sm" onClick={fetchTasks}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Status
            </Button>
          </div>
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm">{error}</span>
          <button
            type="button"
            onClick={() => setError(null)}
            className="ml-auto text-red-400 hover:text-red-300"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Info footer */}
      <div className="p-3 bg-slc-card rounded-lg border border-slc-border">
        <div className="flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
          <div className="text-xs text-slc-muted space-y-1">
            <p>
              <strong>How it works:</strong> Runway AI generates a short video
              from your cover art using the style prompt you choose. The
              generated video can then be used in the Video Generator to add
              countdown overlays, artist name, and pre-save CTAs.
            </p>
            <p>
              <strong>Output:</strong> 5-10 second MP4 video. Ephemeral URLs
              expire in ~24h — download immediately or use in Video Generator.
            </p>
            <p>
              <strong>Cost:</strong> Gen-4 Turbo = $0.05/sec ($0.25 for 5s).
              Gen-4.5 = $0.12/sec ($0.60 for 5s). Credits billed to your Runway
              account.
            </p>
            <p>
              <strong>API & Credits:</strong>{" "}
              <a
                href="https://dev.runwayml.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1"
              >
                Runway Developers <ExternalLink className="w-3 h-3" />
              </a>{" "}
              &mdash; manage API keys, credits, and view documentation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
