"use client";

import { useState, useEffect, useCallback } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import {
  getYouTubeId,
  getVideoThumbnail,
  isYouTubeThumbnailUrl,
  getYouTubeThumbnailFallback,
  getVideoPlaceholderSvg,
} from "@/lib/video-utils";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { VideoUploader, parseVideoUrl } from "@/components/admin/VideoUploader";
import {
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  Star,
  Eye,
  EyeOff,
  Loader2,
  CheckCircle,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  Smartphone,
  Share2,
  Copy,
  ExternalLink,
  Play,
  Video,
  Pencil,
  ImageIcon,
  Save,
  Link as LinkIcon,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadToDropboxDirect } from "@/lib/clients/dropbox-browser";

interface VerticalVideo {
  id: string;
  title: string | null;
  description: string | null;
  videoUrl: string;
  thumbnailUrl: string | null;
  platform: string | null;
  platformUrl: string | null;
  embedUrl: string | null;
  artistId: string | null;
  isFeatured: boolean;
  isPublished: boolean;
  displayOrder: number;
  shareCount: number;
  viewCount: number;
  duration: number | null;
  tags: { id: string; name: string; slug: string }[];
  createdAt: string;
}

interface Artist {
  id: string;
  name: string;
}

interface TagItem {
  id: string;
  name: string;
  slug: string;
}

export default function AdminVerticalVideosPage() {
  const [videos, setVideos] = useState<VerticalVideo[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [artistFilter, setArtistFilter] = useState("");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Upload modal state
  const [showUploader, setShowUploader] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadVideoInfo, setUploadVideoInfo] = useState<any>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadArtistId, setUploadArtistId] = useState("");
  const [uploadTagIds, setUploadTagIds] = useState<string[]>([]);
  const [uploadIsFeatured, setUploadIsFeatured] = useState(false);
  const [uploadThumbnailUrl, setUploadThumbnailUrl] = useState("");
  const [generatingThumbnails, setGeneratingThumbnails] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState("");
  const [fixingUrls, setFixingUrls] = useState(false);

  // Edit modal state
  const [editingVideo, setEditingVideo] = useState<VerticalVideo | null>(null);
  const [editForm, setEditForm] = useState({
    title: "",
    description: "",
    artistId: "",
    isFeatured: false,
    isPublished: true,
    tagIds: [] as string[],
    thumbnailUrl: "",
  });

  // Share modal state
  const [shareVideo, setShareVideo] = useState<VerticalVideo | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [videosRes, artistsRes, tagsRes] = await Promise.all([
        fetch("/api/admin/vertical-videos"),
        fetch("/api/admin/artists"),
        fetch("/api/admin/gallery/tags"),
      ]);

      const videosData = await videosRes.json();
      const artistsData = await artistsRes.json();
      const tagsData = await tagsRes.json();

      if (videosData.success) setVideos(videosData.data || []);
      if (artistsData.success) setArtists(artistsData.data || []);
      if (tagsData.success) setTags(tagsData.data || []);
    } catch (error) {
      console.error("Error fetching data:", error);
      setMessage({ type: "error", text: "Error al cargar los datos" });
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle featured
  const toggleFeatured = async (video: VerticalVideo) => {
    setUpdatingId(video.id);
    try {
      const res = await fetch("/api/admin/vertical-videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: video.id, isFeatured: !video.isFeatured }),
      });
      const data = await res.json();
      if (data.success) {
        setVideos((prev) =>
          prev.map((v) => v.id === video.id ? { ...v, isFeatured: !v.isFeatured } : v)
        );
        setMessage({
          type: "success",
          text: video.isFeatured ? "Video quitado de destacados" : "Video marcado como destacado",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al actualizar" });
    }
    setUpdatingId(null);
    setTimeout(() => setMessage(null), 3000);
  };

  // Toggle published
  const togglePublished = async (video: VerticalVideo) => {
    setUpdatingId(video.id);
    try {
      const res = await fetch("/api/admin/vertical-videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: video.id, isPublished: !video.isPublished }),
      });
      const data = await res.json();
      if (data.success) {
        setVideos((prev) =>
          prev.map((v) => v.id === video.id ? { ...v, isPublished: !v.isPublished } : v)
        );
        setMessage({
          type: "success",
          text: video.isPublished ? "Video ocultado" : "Video publicado",
        });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al actualizar" });
    }
    setUpdatingId(null);
    setTimeout(() => setMessage(null), 3000);
  };

  // Delete video
  const deleteVideo = async (video: VerticalVideo) => {
    if (!confirm(`¿Eliminar "${video.title || "este video"}"?`)) return;
    setUpdatingId(video.id);
    try {
      const res = await fetch(`/api/admin/vertical-videos?id=${video.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setVideos((prev) => prev.filter((v) => v.id !== video.id));
        setMessage({ type: "success", text: "Video eliminado" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al eliminar" });
    }
    setUpdatingId(null);
    setTimeout(() => setMessage(null), 3000);
  };

  // Move video order
  const moveVideo = async (video: VerticalVideo, direction: "up" | "down") => {
    const sorted = [...videos].sort((a, b) => a.displayOrder - b.displayOrder);
    const idx = sorted.findIndex((v) => v.id === video.id);
    if (direction === "up" && idx === 0) return;
    if (direction === "down" && idx === sorted.length - 1) return;

    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    const swapVideo = sorted[swapIdx];

    setUpdatingId(video.id);
    try {
      await Promise.all([
        fetch("/api/admin/vertical-videos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: video.id, displayOrder: swapVideo.displayOrder }),
        }),
        fetch("/api/admin/vertical-videos", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: swapVideo.id, displayOrder: video.displayOrder }),
        }),
      ]);
      fetchData();
      setMessage({ type: "success", text: "Orden actualizado" });
    } catch (error) {
      setMessage({ type: "error", text: "Error al reordenar" });
    }
    setUpdatingId(null);
    setTimeout(() => setMessage(null), 2000);
  };

  // Submit new video
  const submitVideo = async () => {
    if (!uploadVideoInfo) return;
    setUploading(true);
    try {
      const parsed = parseVideoUrl(uploadVideoInfo.url);
      const hasThumbnail = !!(uploadThumbnailUrl || uploadVideoInfo.thumbnailUrl);
      const res = await fetch("/api/admin/vertical-videos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: uploadTitle || uploadVideoInfo.title || null,
          description: uploadDescription || null,
          videoUrl: uploadVideoInfo.url,
          thumbnailUrl: uploadThumbnailUrl || uploadVideoInfo.thumbnailUrl || null,
          platform: uploadVideoInfo.platform || parsed?.platform?.toLowerCase() || null,
          platformUrl: uploadVideoInfo.url,
          embedUrl: uploadVideoInfo.embedUrl || parsed?.embedUrl || null,
          artistId: uploadArtistId || null,
          isFeatured: uploadIsFeatured,
          isPublished: true,
          tagIds: uploadTagIds,
        }),
      });

      const data = await res.json();
      if (data.success) {
        // If no thumbnail was provided, auto-generate one
        if (!hasThumbnail && data.data?.id) {
          setMessage({ type: "success", text: "Video agregado. Generando miniatura automáticamente..." });
          setShowUploader(false);
          resetUploadForm();
          fetchData();

          // Try server-side generation first (uses ffmpeg when available, which is
          // much more reliable than client-side canvas capture).
          // Falls back to client-side if the server can't do it (e.g. Netlify).
          const videoId = data.data.id;
          (async () => {
            try {
              const serverRes = await fetch("/api/admin/vertical-videos/generate-thumbnails", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ videoId }),
              });
              const serverData = await serverRes.json();
              if (serverData.success && serverData.generated > 0) {
                console.log("[Thumbnail] Server-side generation succeeded");
                fetchData();
                return;
              }
            } catch {
              console.log("[Thumbnail] Server-side generation failed, trying client-side");
            }

            // Server-side didn't work — fall back to client-side canvas extraction
            regenerateThumbnail(videoId)
              .then(() => {
                fetchData();
              })
              .catch(() => {
                // Thumbnail generation failed silently - video is still saved
              });
          })();
        } else {
          setMessage({ type: "success", text: "Video agregado exitosamente" });
          setShowUploader(false);
          resetUploadForm();
          fetchData();
        }
      } else {
        setMessage({ type: "error", text: data.error || "Error al agregar video" });
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error de conexión" });
    }
    setUploading(false);
    setTimeout(() => setMessage(null), 3000);
  };

  const resetUploadForm = () => {
    setUploadVideoInfo(null);
    setUploadTitle("");
    setUploadDescription("");
    setUploadArtistId("");
    setUploadTagIds([]);
    setUploadIsFeatured(false);
    setUploadThumbnailUrl("");
  };

  // Open edit modal
  const openEditModal = (video: VerticalVideo) => {
    setEditingVideo(video);
    setEditForm({
      title: video.title || "",
      description: video.description || "",
      artistId: video.artistId || "",
      isFeatured: video.isFeatured,
      isPublished: video.isPublished,
      tagIds: video.tags.map((t) => t.id),
      thumbnailUrl: video.thumbnailUrl || "",
    });
  };

  // Save edit
  const saveEdit = async () => {
    if (!editingVideo) return;
    setUpdatingId(editingVideo.id);
    try {
      const res = await fetch("/api/admin/vertical-videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingVideo.id,
          title: editForm.title || null,
          description: editForm.description || null,
          artistId: editForm.artistId || null,
          isFeatured: editForm.isFeatured,
          isPublished: editForm.isPublished,
          tagIds: editForm.tagIds,
          ...(editForm.thumbnailUrl ? { thumbnailUrl: editForm.thumbnailUrl } : {}),
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({ type: "success", text: "Video actualizado" });
        setEditingVideo(null);
        fetchData();
      }
    } catch (error) {
      setMessage({ type: "error", text: "Error al guardar" });
    }
    setUpdatingId(null);
    setTimeout(() => setMessage(null), 3000);
  };

  // Copy share link
  const copyShareLink = async (videoId: string) => {
    const url = `${window.location.origin}/reels/${videoId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  // Check if a canvas image is mostly black.
  // Uses TWO checks: average brightness AND percentage of dark pixels.
  // A single average check can miss cases where a few bright pixels
  // (e.g. from codec artifacts) pull the average above the threshold
  // while the image is visually black.
  const isCanvasMostlyBlack = (ctx: CanvasRenderingContext2D, width: number, height: number): boolean => {
    try {
      const imageData = ctx.getImageData(0, 0, width, height);
      const data = imageData.data;
      let totalBrightness = 0;
      // Sample every 4th pixel for better coverage
      const step = 4;
      let sampledCount = 0;
      let darkPixelCount = 0;
      for (let i = 0; i < data.length; i += 4 * step) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const brightness = (r + g + b) / 3;
        totalBrightness += brightness;
        if (brightness < 20) darkPixelCount++;
        sampledCount++;
      }
      const avgBrightness = sampledCount > 0 ? totalBrightness / sampledCount : 0;
      const darkRatio = sampledCount > 0 ? darkPixelCount / sampledCount : 0;
      // Consider it black if:
      // 1. Average brightness is below 25, OR
      // 2. More than 90% of pixels are very dark (below 20)
      return avgBrightness < 25 || darkRatio > 0.9;
    } catch {
      return false;
    }
  };

  // Extract a thumbnail from a video blob/object URL using canvas.
  // Uses requestVideoFrameCallback for guaranteed frame-ready detection,
  // with a reliable fallback for browsers that don't support it.
  // IMPORTANT: Never saves a black frame — returns null if all positions are black
  const extractThumbnailFromBlob = async (
    videoBlob: Blob
  ): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";
      // No crossOrigin needed — blob URLs are same-origin

      const objectUrl = URL.createObjectURL(videoBlob);
      video.src = objectUrl;
      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
        URL.revokeObjectURL(objectUrl);
      };

      // Wait for a video frame to be truly ready for canvas capture.
      // Uses requestVideoFrameCallback when available (the ONLY reliable method),
      // falling back to a poll-based approach with longer delays.
      const waitForFrameReady = (): Promise<void> => {
        return new Promise((frameResolve) => {
          const MAX_WAIT = 8000; // Max 8s wait for a single frame
          const startTime = Date.now();

          // Method 1: requestVideoFrameCallback (Chrome 83+, Edge 83+)
          // This is the ONLY API that guarantees the video has produced a
          // composited frame that canvas.drawImage() can capture.
          if ('requestVideoFrameCallback' in HTMLVideoElement.prototype) {
            const onFrame = () => {
              // The callback fired — the video has at least one composited frame.
              // Wait one more animation frame to ensure the GPU has finished
              // any pending decode work before we try canvas.drawImage().
              requestAnimationFrame(() => {
                // Double-check that the video dimensions are valid
                if (video.videoWidth > 0 && video.videoHeight > 0) {
                  frameResolve();
                } else {
                  // Dimensions not ready yet — poll briefly
                  const pollDimensions = () => {
                    if (video.videoWidth > 0 && video.videoHeight > 0) {
                      frameResolve();
                    } else if (Date.now() - startTime < MAX_WAIT) {
                      setTimeout(pollDimensions, 100);
                    } else {
                      console.warn("[Thumbnail] Timed out waiting for video dimensions");
                      frameResolve();
                    }
                  };
                  pollDimensions();
                }
              });
            };

            try {
              video.requestVideoFrameCallback(onFrame);
              // If the video is already at a frame, the callback might never fire
              // (it only fires on NEW frames). Also set up a timeout fallback.
              setTimeout(() => {
                if (video.readyState >= 2 && video.videoWidth > 0) {
                  frameResolve();
                }
              }, 2000);
              return;
            } catch {
              // requestVideoFrameCallback not actually available, fall through
            }
          }

          // Method 2: Poll-based fallback (Firefox, Safari, older browsers)
          // Wait for readyState >= 2 (HAVE_CURRENT_DATA) + videoWidth > 0,
          // then add a generous delay for the decoder to fully render.
          const checkReady = () => {
            if (Date.now() - startTime > MAX_WAIT) {
              console.warn("[Thumbnail] waitForFrameReady timed out after 8s");
              frameResolve();
              return;
            }
            if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
              // Use a longer delay (800ms) for the poll-based fallback since
              // we can't be certain the frame is composited yet.
              setTimeout(() => frameResolve(), 800);
              return;
            }
            setTimeout(checkReady, 100);
          };
          checkReady();
        });
      };

      // Try multiple seek positions to find a non-black frame
      const seekPositions = [0.5, 1.0, 2.0, 3.0, 5.0];
      let currentSeekIndex = 0;
      let bestBlob: Blob | null = null;
      let retryCountAtPosition = 0;
      const MAX_RETRIES_PER_POSITION = 2;

      const tryCaptureFrame = (): boolean => {
        try {
          if (video.videoWidth === 0 || video.videoHeight === 0) {
            console.warn(`[Thumbnail] Video dimensions not ready: ${video.videoWidth}x${video.videoHeight}`);
            return false;
          }

          const canvas = document.createElement("canvas");
          const maxDim = 480;
          const scale = Math.min(
            maxDim / video.videoWidth,
            maxDim / video.videoHeight,
            1
          );
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);

          const ctx = canvas.getContext("2d");
          if (!ctx) return false;

          // Clear the canvas to ensure no stale data
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

          const isBlack = isCanvasMostlyBlack(ctx, canvas.width, canvas.height);

          if (!isBlack) {
            // Found a good frame! Convert to blob immediately
            canvas.toBlob(
              (blob) => {
                canvas.remove();
                if (blob) {
                  bestBlob = blob;
                }
                finish();
              },
              "image/jpeg",
              0.85
            );
            return true;
          }

          canvas.remove();
          console.log(`[Thumbnail] Frame at ${video.currentTime}s is black (retry ${retryCountAtPosition}/${MAX_RETRIES_PER_POSITION})`);
          return false;
        } catch (e) {
          console.warn("[Thumbnail] tryCaptureFrame error:", e);
          return false;
        }
      };

      const finish = async () => {
        cleanup();
        if (!bestBlob) {
          resolve(null);
          return;
        }
        // Upload thumbnail to Dropbox
        try {
          const thumbFile = new File([bestBlob], "thumbnail.jpg", {
            type: "image/jpeg",
          });
          const result = await uploadToDropboxDirect(
            thumbFile,
            "/vertical-videos/thumbnails",
            undefined
          );
          resolve(result.success ? result.url || null : null);
        } catch {
          resolve(null);
        }
      };

      const tryNextSeek = () => {
        // If we haven't retried enough times at this position, retry with longer wait
        if (retryCountAtPosition < MAX_RETRIES_PER_POSITION) {
          retryCountAtPosition++;
          console.log(`[Thumbnail] Retrying same position (attempt ${retryCountAtPosition})`);
          // Re-seek to the same position to force a fresh decode
          const currentTime = video.currentTime;
          video.currentTime = 0;
          setTimeout(() => {
            if (!resolved) video.currentTime = currentTime;
          }, 200);
          return;
        }

        // Move to next position
        retryCountAtPosition = 0;
        currentSeekIndex++;
        if (currentSeekIndex < seekPositions.length) {
          const nextTime = seekPositions[currentSeekIndex];
          if (isFinite(nextTime) && nextTime < (video.duration || Infinity)) {
            video.currentTime = nextTime;
            return;
          }
        }
        // All positions gave black frames — do NOT save a black thumbnail
        console.warn("[Thumbnail] All seek positions produced black frames, skipping");
        cleanup();
        resolve(null);
      };

      // KEY FIX: Wait for 'loadeddata' instead of 'loadedmetadata'.
      // 'loadedmetadata' fires when we know duration/dimensions but the decoder
      // hasn't produced any frames yet. 'loadeddata' fires when the first frame
      // is actually decoded and available for rendering/canvas capture.
      video.addEventListener("loadeddata", () => {
        const duration = video.duration;
        console.log(`[Thumbnail] Video data loaded: duration=${duration}s, dimensions=${video.videoWidth}x${video.videoHeight}, readyState=${video.readyState}`);
        // Add percentage-based positions
        if (isFinite(duration) && duration > 0) {
          seekPositions.push(duration * 0.1, duration * 0.25, duration * 0.5);
        }
        // Start seeking
        video.currentTime = seekPositions[0] || 1.0;
      }, { once: true });

      // Also listen for loadedmetadata as a safety net — if loadeddata never fires
      // (rare, but possible with some codecs), we still want to proceed.
      video.addEventListener("loadedmetadata", () => {
        // If loadeddata already fired, this is redundant. If not, this is our fallback.
        if (video.readyState >= 2) return; // loadeddata already happened
        console.log("[Thumbnail] loadedmetadata fired (loadeddata fallback)");
        const duration = video.duration;
        if (isFinite(duration) && duration > 0) {
          seekPositions.push(duration * 0.1, duration * 0.25, duration * 0.5);
        }
        // Wait a bit longer before seeking since we don't have decoded frames yet
        setTimeout(() => {
          if (!resolved) video.currentTime = seekPositions[0] || 1.0;
        }, 500);
      }, { once: true });

      video.onseeked = async () => {
        if (resolved) return;
        try {
          // Wait for the frame to be truly ready for canvas capture
          await waitForFrameReady();

          const found = tryCaptureFrame();
          if (found) return;

          tryNextSeek();
        } catch {
          tryNextSeek();
        }
      };

      video.onerror = () => {
        cleanup();
        resolve(null);
      };

      // Timeout — 60s to allow for larger videos and retries
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 60000);
    });
  };

  // Extract a thumbnail by PLAYING the video and capturing a frame during playback.
  // This is a last-resort fallback when seeking produces only black frames.
  // Playing forces the decoder to produce real frames, which canvas can capture.
  const extractThumbnailViaPlayback = (videoBlob: Blob): Promise<string | null> => {
    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.muted = true;
      video.playsInline = true;
      video.preload = "auto";

      const objectUrl = URL.createObjectURL(videoBlob);
      video.src = objectUrl;
      let resolved = false;

      const cleanup = () => {
        if (resolved) return;
        resolved = true;
        video.pause();
        video.removeAttribute("src");
        video.load();
        video.remove();
        URL.revokeObjectURL(objectUrl);
      };

      const captureFrame = (): string | null => {
        try {
          if (video.videoWidth === 0 || video.videoHeight === 0) return null;
          const canvas = document.createElement("canvas");
          const maxDim = 480;
          const scale = Math.min(maxDim / video.videoWidth, maxDim / video.videoHeight, 1);
          canvas.width = Math.round(video.videoWidth * scale);
          canvas.height = Math.round(video.videoHeight * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) return null;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          if (isCanvasMostlyBlack(ctx, canvas.width, canvas.height)) {
            canvas.remove();
            return null;
          }
          // Convert to data URL synchronously (small thumbnail)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          canvas.remove();
          return dataUrl;
        } catch {
          return null;
        }
      };

      // Wait for the video to start playing, then try to capture frames
      let captureAttempts = 0;
      const MAX_CAPTURE_ATTEMPTS = 15; // Try for up to ~3 seconds of playback

      video.addEventListener("playing", () => {
        // Try capturing frames at intervals during playback
        const tryCapture = () => {
          if (resolved) return;
          captureAttempts++;

          const dataUrl = captureFrame();
          if (dataUrl) {
            // Got a good frame! Upload it.
            cleanup();
            // Convert data URL to blob for upload
            fetch(dataUrl)
              .then(r => r.blob())
              .then(blob => {
                const thumbFile = new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
                return uploadToDropboxDirect(thumbFile, "/vertical-videos/thumbnails", undefined);
              })
              .then(result => {
                resolve(result.success ? result.url || null : null);
              })
              .catch(() => resolve(null));
            return;
          }

          if (captureAttempts < MAX_CAPTURE_ATTEMPTS) {
            // Try again in 200ms
            setTimeout(tryCapture, 200);
          } else {
            // Give up
            cleanup();
            resolve(null);
          }
        };

        // Start capturing after a short delay to let the first few frames render
        setTimeout(tryCapture, 300);
      }, { once: true });

      video.addEventListener("loadeddata", () => {
        // Start playback — this forces the decoder to produce frames
        video.play().catch(() => {
          cleanup();
          resolve(null);
        });
      }, { once: true });

      video.onerror = () => {
        cleanup();
        resolve(null);
      };

      // Timeout
      setTimeout(() => {
        cleanup();
        resolve(null);
      }, 30000);
    });
  };

  // Regenerate thumbnail for a single video (downloads full video then extracts frame)
  // Uses multiple strategies: seek-based extraction, then playback-based as fallback.
  const regenerateThumbnail = async (videoId: string) => {
    setUpdatingId(videoId);
    setMessage({ type: "success", text: "Descargando video para extraer miniatura..." });

    try {
      // Step 1: Get a direct download URL from the server
      const urlRes = await fetch(`/api/admin/vertical-videos/video-download-url?videoId=${videoId}`);
      const urlData = await urlRes.json();

      if (!urlData.success || !urlData.downloadUrl) {
        throw new Error(urlData.error || "No se pudo obtener URL de descarga");
      }

      setMessage({ type: "success", text: "Descargando video completo..." });

      // Step 2: Fetch the full video as a blob
      const videoRes = await fetch(urlData.downloadUrl);
      if (!videoRes.ok) {
        throw new Error(`Error descargando video: ${videoRes.status}`);
      }

      const videoBlob = await videoRes.blob();
      console.log(`[Thumbnail] Downloaded video blob: ${(videoBlob.size / 1024 / 1024).toFixed(1)} MB`);

      setMessage({ type: "success", text: "Extrayendo frame del video..." });

      // Step 3: Try seek-based thumbnail extraction
      let thumbnailUrl = await extractThumbnailFromBlob(videoBlob);

      // Step 4: If seek-based failed, try playback-based extraction.
      // This forces the video to actually play, which guarantees the decoder
      // produces real frames that canvas can capture.
      if (!thumbnailUrl) {
        console.log("[Thumbnail] Seek-based extraction failed, trying playback-based...");
        setMessage({ type: "success", text: "Reintentando con reproducción..." });
        thumbnailUrl = await extractThumbnailViaPlayback(videoBlob);
      }

      if (!thumbnailUrl) {
        throw new Error("No se pudo extraer un frame del video (posible video negro o corrupto)");
      }

      // Step 5: Save to database
      const saveRes = await fetch("/api/admin/vertical-videos", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: videoId, thumbnailUrl }),
      });
      const saveData = await saveRes.json();

      if (saveData.success) {
        setVideos((prev) =>
          prev.map((v) => v.id === videoId ? { ...v, thumbnailUrl } : v)
        );
        setMessage({ type: "success", text: "Miniatura regenerada exitosamente" });
      } else {
        throw new Error(saveData.error || "Error guardando miniatura");
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Error desconocido";
      setMessage({ type: "error", text: `Error regenerando miniatura: ${msg}` });
    }

    setUpdatingId(null);
    setTimeout(() => setMessage(null), 5000);
  };

  // Generate missing thumbnails
  const generateMissingThumbnails = async () => {
    const videosWithoutThumbnail = videos.filter((v) => !v.thumbnailUrl);
    if (videosWithoutThumbnail.length === 0) {
      setMessage({ type: "success", text: "Todos los videos ya tienen miniatura" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setGeneratingThumbnails(true);
    setThumbnailProgress("");

    // Step 1: Try server-side generation (works with ffmpeg on dev server)
    try {
      setThumbnailProgress("Intentando generación del servidor...");
      const res = await fetch(
        "/api/admin/vertical-videos/generate-thumbnails",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: false }),
        }
      );
      const data = await res.json();

      if (data.success && data.generated > 0) {
        setMessage({
          type: "success",
          text: data.message || `Se generaron ${data.generated} miniaturas`,
        });
        fetchData();
        setGeneratingThumbnails(false);
        setThumbnailProgress("");
        setTimeout(() => setMessage(null), 5000);
        return;
      }

      // Server-side didn't generate any – fall through to client-side
      console.log(
        "[Thumbnails] Server-side generated 0, falling back to client-side"
      );
    } catch {
      console.log(
        "[Thumbnails] Server-side failed, falling back to client-side"
      );
    }

    // Step 2: Client-side extraction via full video download + canvas
    const remaining = videos.filter((v) => !v.thumbnailUrl);
    if (remaining.length === 0) {
      setMessage({ type: "success", text: "Todas las miniaturas fueron generadas" });
      setGeneratingThumbnails(false);
      setThumbnailProgress("");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    let generated = 0;
    for (let i = 0; i < remaining.length; i++) {
      const video = remaining[i];
      setThumbnailProgress(
        `Extrayendo miniatura ${i + 1}/${remaining.length}...`
      );

      try {
        // Get a direct download URL
        const urlRes = await fetch(`/api/admin/vertical-videos/video-download-url?videoId=${video.id}`);
        const urlData = await urlRes.json();

        if (!urlData.success || !urlData.downloadUrl) {
          console.warn(`[Thumbnails] No download URL for ${video.id}`);
          continue;
        }

        // Fetch full video as blob
        const videoRes = await fetch(urlData.downloadUrl);
        if (!videoRes.ok) continue;
        const videoBlob = await videoRes.blob();

        // Extract thumbnail from the complete video (seek-based first, playback-based fallback)
        let thumbnailUrl = await extractThumbnailFromBlob(videoBlob);

        // If seek-based extraction failed, try playback-based
        if (!thumbnailUrl) {
          console.log(`[Thumbnails] Seek-based failed for ${video.id}, trying playback-based...`);
          thumbnailUrl = await extractThumbnailViaPlayback(videoBlob);
        }

        if (thumbnailUrl) {
          // Save to database
          await fetch("/api/admin/vertical-videos", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: video.id, thumbnailUrl }),
          });
          generated++;

          // Optimistic update
          setVideos((prev) =>
            prev.map((v) =>
              v.id === video.id ? { ...v, thumbnailUrl } : v
            )
          );
        }
      } catch {
        // Skip this video, continue with the rest
      }
    }

    if (generated > 0) {
      setMessage({
        type: "success",
        text: `Se generaron ${generated} miniaturas de ${remaining.length} videos`,
      });
      fetchData();
    } else {
      setMessage({
        type: "error",
        text: "No se pudieron generar miniaturas. Intenta subir los videos nuevamente.",
      });
    }

    setGeneratingThumbnails(false);
    setThumbnailProgress("");
    setTimeout(() => setMessage(null), 5000);
  };

  // Fix broken thumbnail/video URLs (dl.dropboxusercontent.com → ?raw=1)
  const fixThumbnailUrls = async () => {
    setFixingUrls(true);
    try {
      const res = await fetch("/api/admin/vertical-videos/generate-thumbnails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fixUrls: true }),
      });
      const data = await res.json();
      if (data.success) {
        setMessage({
          type: "success",
          text: data.message || "URLs arregladas",
        });
        fetchData();
      } else {
        setMessage({ type: "error", text: data.error || "Error arreglando URLs" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    }
    setFixingUrls(false);
    setTimeout(() => setMessage(null), 5000);
  };

  // Get platform badge color
  const getPlatformColor = (platform: string | null) => {
    switch (platform?.toLowerCase()) {
      case "youtube": return "bg-red-600";
      case "instagram": return "bg-gradient-to-r from-purple-600 to-pink-500";
      case "tiktok": return "bg-black";
      case "dropbox": return "bg-blue-600";
      default: return "bg-slc-card";
    }
  };

  // Filtered videos
  const filteredVideos = videos.filter((video) => {
    const matchesSearch = !searchQuery ||
      video.title?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesArtist = !artistFilter || video.artistId === artistFilter;
    return matchesSearch && matchesArtist;
  });

  const featuredCount = videos.filter((v) => v.isFeatured).length;
  const totalViews = videos.reduce((acc, v) => acc + (v.viewCount || 0), 0);
  const totalShares = videos.reduce((acc, v) => acc + (v.shareCount || 0), 0);

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="font-oswald text-3xl uppercase flex items-center gap-3">
            <Smartphone className="w-8 h-8 text-primary" />
            Reels / Verticales
          </h1>
          <p className="text-slc-muted mt-1">
            Videos verticales 9:16 - Reels, TikTok, YouTube Shorts
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            Actualizar
          </Button>
          {videos.some((v) => !v.thumbnailUrl) && (
            <Button
              variant="outline"
              onClick={generateMissingThumbnails}
              disabled={generatingThumbnails}
              className="border-yellow-500/50 text-yellow-500 hover:bg-yellow-500/10"
            >
              {generatingThumbnails ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ImageIcon className="w-4 h-4 mr-2" />
              )}
              {generatingThumbnails
                ? thumbnailProgress || "Generando..."
                : "Generar Miniaturas"}
            </Button>
          )}
          {videos.some((v) => v.thumbnailUrl?.includes("dl.dropboxusercontent.com") || v.videoUrl?.includes("dl.dropboxusercontent.com")) && (
            <Button
              variant="outline"
              onClick={fixThumbnailUrls}
              disabled={fixingUrls}
              className="border-blue-500/50 text-blue-500 hover:bg-blue-500/10"
            >
              {fixingUrls ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              {fixingUrls ? "Arreglando URLs..." : "Arreglar URLs Dropbox"}
            </Button>
          )}
          <Button onClick={() => setShowUploader(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Video
          </Button>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div
          className={cn(
            "mb-6 p-4 rounded-lg flex items-center gap-2",
            message.type === "success"
              ? "bg-green-500/10 border border-green-500/20 text-green-500"
              : "bg-red-500/10 border border-red-500/20 text-red-500"
          )}
        >
          {message.type === "success" ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-primary">{videos.length}</div>
          <div className="text-xs text-slc-muted uppercase">Total Videos</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-yellow-500">{featuredCount}</div>
          <div className="text-xs text-slc-muted uppercase">Destacados</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-green-500">{totalViews}</div>
          <div className="text-xs text-slc-muted uppercase">Vistas</div>
        </div>
        <div className="bg-slc-card border border-slc-border rounded-lg p-4 text-center">
          <div className="font-oswald text-2xl text-blue-500">{totalShares}</div>
          <div className="text-xs text-slc-muted uppercase">Compartidos</div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slc-muted" />
          <Input
            placeholder="Buscar videos..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={artistFilter}
          onChange={(e) => setArtistFilter(e.target.value)}
          className="px-4 py-2 bg-slc-card border border-slc-border rounded-lg"
        >
          <option value="">Todos los artistas</option>
          {artists.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <>
          {/* Videos Grid - Phone-shaped cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredVideos.map((video) => (
              <div
                key={video.id}
                className={cn(
                  "bg-slc-dark border rounded-xl overflow-hidden group relative",
                  video.isFeatured
                    ? "border-yellow-500/50 ring-1 ring-yellow-500/20"
                    : "border-slc-border"
                )}
              >
                {/* Thumbnail - 9:16 aspect ratio */}
                <div className="relative aspect-[9/16] bg-black">
                  {getVideoThumbnail(video) ? (
                    <SafeImage
                      src={getVideoThumbnail(video)!}
                      alt={video.title || "Video"}
                      fill
                      className="object-cover"
                      sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                      fallbackSrc={(() => {
                        const thumb = getVideoThumbnail(video)!;
                        const ytId = getYouTubeId(video);
                        if (ytId && isYouTubeThumbnailUrl(thumb)) {
                          return getYouTubeThumbnailFallback(ytId, thumb) || getVideoPlaceholderSvg("9/16");
                        }
                        return getVideoPlaceholderSvg("9/16");
                      })()}
                    />
                  ) : (
                    <div className="w-full h-full bg-slc-card flex items-center justify-center">
                      <Smartphone className="w-10 h-10 text-slc-muted" />
                    </div>
                  )}

                  {/* Play overlay */}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                      <Play className="w-6 h-6 text-white ml-0.5" fill="white" />
                    </div>
                  </div>

                  {/* Platform badge */}
                  {video.platform && (
                    <div className={cn("absolute top-2 left-2 px-2 py-0.5 rounded text-xs text-white", getPlatformColor(video.platform))}>
                      {video.platform}
                    </div>
                  )}

                  {/* Featured badge */}
                  {video.isFeatured && (
                    <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-yellow-500 rounded text-xs font-medium text-black flex items-center gap-0.5">
                      <Star className="w-3 h-3" fill="currentColor" />
                    </div>
                  )}

                  {/* Unpublished badge */}
                  {!video.isPublished && (
                    <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-red-500 rounded text-xs text-white flex items-center gap-0.5">
                      <EyeOff className="w-3 h-3" />
                    </div>
                  )}

                  {/* Order controls */}
                  <div className="absolute top-2 right-2 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {video.isFeatured && <div className="h-5" />}
                    <button
                      onClick={() => moveVideo(video, "up")}
                      className="w-6 h-6 bg-black/70 hover:bg-black rounded flex items-center justify-center text-white"
                      title="Mover arriba"
                    >
                      <ArrowUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => moveVideo(video, "down")}
                      className="w-6 h-6 bg-black/70 hover:bg-black rounded flex items-center justify-center text-white"
                      title="Mover abajo"
                    >
                      <ArrowDown className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Stats overlay */}
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                    <div className="flex items-center gap-2 text-xs text-white/80">
                      <span className="flex items-center gap-0.5">
                        <Eye className="w-3 h-3" /> {video.viewCount}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Share2 className="w-3 h-3" /> {video.shareCount}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Info */}
                <div className="p-2">
                  <h3 className="text-xs font-medium line-clamp-2">
                    {video.title || "Sin título"}
                  </h3>

                  {/* Actions */}
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slc-border">
                    <button
                      onClick={() => openEditModal(video)}
                      className="p-1 hover:bg-slc-card rounded transition-colors"
                      title="Editar"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => regenerateThumbnail(video.id)}
                        className={cn(
                          "p-1 rounded transition-colors",
                          "text-slc-muted hover:text-primary hover:bg-slc-card"
                        )}
                        title="Regenerar miniatura"
                        disabled={updatingId === video.id}
                      >
                        {updatingId === video.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => setShareVideo(video)}
                        className="p-1 text-blue-400 hover:text-blue-300 hover:bg-slc-card rounded transition-colors"
                        title="Compartir"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleFeatured(video)}
                        className={cn(
                          "p-1 rounded transition-colors",
                          video.isFeatured ? "text-yellow-500" : "text-slc-muted hover:text-yellow-500"
                        )}
                        title={video.isFeatured ? "Quitar de destacados" : "Destacar"}
                      >
                        <Star className="w-3.5 h-3.5" fill={video.isFeatured ? "currentColor" : "none"} />
                      </button>
                      <button
                        onClick={() => togglePublished(video)}
                        className={cn(
                          "p-1 rounded transition-colors",
                          video.isPublished ? "text-green-500" : "text-red-500"
                        )}
                        title={video.isPublished ? "Ocultar" : "Publicar"}
                      >
                        {video.isPublished ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        onClick={() => deleteVideo(video)}
                        className="p-1 text-red-500 hover:text-red-400 hover:bg-slc-card rounded transition-colors"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {filteredVideos.length === 0 && !loading && (
            <div className="text-center py-16">
              <Smartphone className="w-16 h-16 text-slc-muted mx-auto mb-4" />
              <h3 className="font-oswald text-xl uppercase mb-2">No hay videos verticales</h3>
              <p className="text-slc-muted mb-6">
                {searchQuery || artistFilter
                  ? "No se encontraron videos con esos filtros."
                  : "Agrega videos verticales (9:16) para mostrar en Reels."}
              </p>
              {!searchQuery && !artistFilter && (
                <Button onClick={() => setShowUploader(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Video Vertical
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-2xl max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Agregar Video Vertical (9:16)
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { setShowUploader(false); resetUploadForm(); }}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              {/* Video Uploader */}
              <VideoUploader
                value={uploadVideoInfo}
                onChange={setUploadVideoInfo}
                label="Video Vertical"
                description="Video formato 9:16 para Reels, TikTok, YouTube Shorts"
                orientation="vertical"
                folder="/vertical-videos"
              />

              {/* Title */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">Título</label>
                <Input
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Nombre del video..."
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">Descripción</label>
                <textarea
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Descripción opcional..."
                  className="w-full h-20 p-3 bg-slc-card border border-slc-border rounded-lg text-sm resize-none"
                />
              </div>

              {/* Artist */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">Artista</label>
                <select
                  value={uploadArtistId}
                  onChange={(e) => setUploadArtistId(e.target.value)}
                  className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg"
                >
                  <option value="">Sin artista</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setUploadTagIds(prev =>
                          prev.includes(tag.id) ? prev.filter(id => id !== tag.id) : [...prev, tag.id]
                        );
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-colors",
                        uploadTagIds.includes(tag.id)
                          ? "bg-primary text-white"
                          : "bg-slc-card border border-slc-border hover:border-primary/50"
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Thumbnail URL override */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  URL de miniatura (opcional)
                </label>
                <Input
                  value={uploadThumbnailUrl}
                  onChange={(e) => setUploadThumbnailUrl(e.target.value)}
                  placeholder={uploadVideoInfo?.thumbnailUrl ? "Ya generada automáticamente" : "Se genera automáticamente al subir video"}
                  className="text-sm"
                />
                {uploadVideoInfo?.thumbnailUrl && !uploadThumbnailUrl && (
                  <p className="text-xs text-green-500 mt-1 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Miniatura generada automáticamente
                  </p>
                )}
              </div>

              {/* Featured toggle */}
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={uploadIsFeatured}
                  onChange={(e) => setUploadIsFeatured(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm">Marcar como destacado</span>
                <Star className="w-4 h-4 text-yellow-500" />
              </label>

              {/* Submit */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => { setShowUploader(false); resetUploadForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={submitVideo} disabled={!uploadVideoInfo || uploading}>
                  {uploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                  Agregar Video
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-lg max-h-[85vh] overflow-auto">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase">Editar Video</h2>
              <Button variant="ghost" size="icon" onClick={() => setEditingVideo(null)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">Título</label>
                <Input
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">Descripción</label>
                <textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full h-20 p-3 bg-slc-card border border-slc-border rounded-lg text-sm resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">Artista</label>
                <select
                  value={editForm.artistId}
                  onChange={(e) => setEditForm({ ...editForm, artistId: e.target.value })}
                  className="w-full px-4 py-2 bg-slc-card border border-slc-border rounded-lg"
                >
                  <option value="">Sin artista</option>
                  {artists.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-slc-muted mb-1.5">Etiquetas</label>
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => {
                        setEditForm(prev => ({
                          ...prev,
                          tagIds: prev.tagIds.includes(tag.id)
                            ? prev.tagIds.filter(id => id !== tag.id)
                            : [...prev.tagIds, tag.id]
                        }));
                      }}
                      className={cn(
                        "px-3 py-1.5 rounded-full text-sm transition-colors",
                        editForm.tagIds.includes(tag.id)
                          ? "bg-primary text-white"
                          : "bg-slc-card border border-slc-border hover:border-primary/50"
                      )}
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              </div>
              {/* Thumbnail URL */}
              <div>
                <label className="block text-sm text-slc-muted mb-1.5 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5" />
                  URL de miniatura
                </label>
                <Input
                  value={editForm.thumbnailUrl}
                  onChange={(e) => setEditForm({ ...editForm, thumbnailUrl: e.target.value })}
                  placeholder="https://ejemplo.com/thumbnail.jpg"
                  className="text-sm"
                />
                {!editForm.thumbnailUrl && editingVideo.thumbnailUrl && (
                  <p className="text-xs text-yellow-500 mt-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Dejar vacío para mantener la miniatura actual
                  </p>
                )}
                {editingVideo.thumbnailUrl && (
                  <div className="mt-2 relative w-20 h-32 rounded overflow-hidden bg-black">
                    <SafeImage
                      src={editingVideo.thumbnailUrl}
                      alt="Miniatura actual"
                      fill
                      className="object-cover"
                      fallbackSrc={getVideoPlaceholderSvg("9/16")}
                    />
                  </div>
                )}
              </div>
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isFeatured}
                    onChange={(e) => setEditForm({ ...editForm, isFeatured: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Destacado</span>
                  <Star className="w-4 h-4 text-yellow-500" />
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editForm.isPublished}
                    onChange={(e) => setEditForm({ ...editForm, isPublished: e.target.checked })}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm">Publicado</span>
                  {editForm.isPublished ? <Eye className="w-4 h-4 text-green-500" /> : <EyeOff className="w-4 h-4 text-red-500" />}
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setEditingVideo(null)}>Cancelar</Button>
                <Button onClick={saveEdit}>
                  <Save className="w-4 h-4 mr-2" />
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {shareVideo && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-slc-dark border border-slc-border rounded-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-slc-border">
              <h2 className="font-oswald text-xl uppercase flex items-center gap-2">
                <Share2 className="w-5 h-5 text-primary" />
                Compartir Video
              </h2>
              <Button variant="ghost" size="icon" onClick={() => { setShareVideo(null); setCopiedLink(false); }}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slc-muted">{shareVideo.title || "Video sin título"}</p>

              {/* Share Link */}
              <div className="flex items-center gap-2">
                <div className="flex-1 p-3 bg-slc-card border border-slc-border rounded-lg text-sm truncate">
                  {typeof window !== "undefined" ? `${window.location.origin}/reels/${shareVideo.id}` : `/reels/${shareVideo.id}`}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyShareLink(shareVideo.id)}
                  title="Copiar enlace"
                >
                  {copiedLink ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>

              {/* Social Share Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    const url = `${window.location.origin}/reels/${shareVideo.id}`;
                    const text = shareVideo.title || "Mira este video de Sonido Líquido Crew";
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: text, url });
                      } catch {}
                    } else {
                      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`);
                    }
                    fetch(`/api/vertical-videos/${shareVideo.id}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ platform: "whatsapp" }),
                    });
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                  WhatsApp
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const url = `${window.location.origin}/reels/${shareVideo.id}`;
                    const text = shareVideo.title || "Mira este video";
                    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`);
                    fetch(`/api/vertical-videos/${shareVideo.id}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ platform: "twitter" }),
                    });
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                  X / Twitter
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const url = `${window.location.origin}/reels/${shareVideo.id}`;
                    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
                    fetch(`/api/vertical-videos/${shareVideo.id}`, {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ platform: "facebook" }),
                    });
                  }}
                >
                  <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                  Facebook
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    const url = `${window.location.origin}/reels/${shareVideo.id}`;
                    const text = shareVideo.title || "Mira este video de Sonido Líquido Crew";
                    if (navigator.share) {
                      try {
                        await navigator.share({ title: text, url });
                        fetch(`/api/vertical-videos/${shareVideo.id}`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ platform: "native" }),
                        });
                      } catch {}
                    } else {
                      await copyShareLink(shareVideo.id);
                    }
                  }}
                >
                  <Share2 className="w-4 h-4 mr-2" />
                  Más opciones
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
