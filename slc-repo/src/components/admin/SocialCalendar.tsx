"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Instagram,
  Youtube,
  Twitter,
  Facebook,
  ChevronLeft,
  ChevronRight,
  Edit2,
  Check,
  X,
  Copy,
  Bell,
  Sparkles,
  Rocket,
  Music,
  Video,
  Image as ImageIcon,
  FileText,
  ExternalLink,
} from "lucide-react";

// TikTok icon
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
    </svg>
  );
}

type Platform = "instagram" | "tiktok" | "youtube" | "twitter" | "facebook";
type ContentType = "video" | "image" | "story" | "reel" | "post";
type PostStatus = "draft" | "scheduled" | "published" | "failed";

interface ScheduledPost {
  id: string;
  platform: Platform;
  contentType: ContentType;
  caption: string;
  mediaUrl?: string;
  scheduledDate: Date;
  scheduledTime: string;
  status: PostStatus;
  hashtags: string[];
  notes?: string;
}

interface SocialCalendarProps {
  releaseTitle: string;
  releaseDate: Date;
  presaveUrl?: string;
  coverImageUrl?: string;
  onPostsChange?: (posts: ScheduledPost[]) => void;
  className?: string;
}

const PLATFORMS: { id: Platform; name: string; icon: React.ReactNode; color: string }[] = [
  { id: "instagram", name: "Instagram", icon: <Instagram className="w-4 h-4" />, color: "bg-gradient-to-br from-purple-600 via-pink-500 to-orange-400" },
  { id: "tiktok", name: "TikTok", icon: <TikTokIcon className="w-4 h-4" />, color: "bg-black" },
  { id: "youtube", name: "YouTube", icon: <Youtube className="w-4 h-4" />, color: "bg-red-600" },
  { id: "twitter", name: "X", icon: <Twitter className="w-4 h-4" />, color: "bg-black" },
  { id: "facebook", name: "Facebook", icon: <Facebook className="w-4 h-4" />, color: "bg-blue-600" },
];

const CONTENT_TYPES: { id: ContentType; name: string; icon: React.ReactNode }[] = [
  { id: "reel", name: "Reel/Short", icon: <Video className="w-4 h-4" /> },
  { id: "story", name: "Story", icon: <Sparkles className="w-4 h-4" /> },
  { id: "post", name: "Post", icon: <ImageIcon className="w-4 h-4" /> },
  { id: "video", name: "Video", icon: <Youtube className="w-4 h-4" /> },
];

// Pre-save campaign post templates
const POST_TEMPLATES = [
  {
    name: "Teaser Inicial",
    daysBeforeRelease: 14,
    platform: "instagram" as Platform,
    contentType: "reel" as ContentType,
    caption: "🔥 Algo grande viene... 👀\n\n#ComingSoon #NuevaMusica",
    time: "19:00",
  },
  {
    name: "Anuncio de Pre-save",
    daysBeforeRelease: 10,
    platform: "instagram" as Platform,
    contentType: "post" as ContentType,
    caption: "🚨 PRE-SAVE YA DISPONIBLE 🚨\n\n{title} sale el {date}!\n\n🔗 Link en bio para pre-guardar\n\n#PreSave #NuevoSingle",
    time: "18:00",
  },
  {
    name: "Behind the Scenes",
    daysBeforeRelease: 7,
    platform: "tiktok" as Platform,
    contentType: "video" as ContentType,
    caption: "Behind the scenes de {title} 🎬\n\nPre-save link in bio ⬆️",
    time: "20:00",
  },
  {
    name: "Countdown Story",
    daysBeforeRelease: 3,
    platform: "instagram" as Platform,
    contentType: "story" as ContentType,
    caption: "¡3 días para {title}! ⏳\n\n¿Ya hiciste pre-save?",
    time: "12:00",
  },
  {
    name: "Último Recordatorio",
    daysBeforeRelease: 1,
    platform: "instagram" as Platform,
    contentType: "story" as ContentType,
    caption: "🚀 MAÑANA ES EL DÍA 🚀\n\nÚltima oportunidad de pre-save ⬇️",
    time: "19:00",
  },
  {
    name: "Día de Lanzamiento",
    daysBeforeRelease: 0,
    platform: "instagram" as Platform,
    contentType: "reel" as ContentType,
    caption: "🎉 ¡YA ESTÁ AQUÍ! 🎉\n\n{title} disponible AHORA en todas las plataformas 🎧\n\n#OutNow #StreamNow",
    time: "00:01",
  },
];

function generateId() {
  return Math.random().toString(36).substring(2, 15);
}

export function SocialCalendar({
  releaseTitle,
  releaseDate,
  presaveUrl,
  coverImageUrl,
  onPostsChange,
  className = "",
}: SocialCalendarProps) {
  const [posts, setPosts] = useState<ScheduledPost[]>([]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isAddingPost, setIsAddingPost] = useState(false);
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);

  // New post form state
  const [newPost, setNewPost] = useState<Partial<ScheduledPost>>({
    platform: "instagram",
    contentType: "reel",
    caption: "",
    scheduledTime: "19:00",
    hashtags: [],
    status: "draft",
  });

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    const days: (Date | null)[] = [];

    // Padding for previous month
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [currentMonth]);

  // Get posts for a specific date
  const getPostsForDate = (date: Date) => {
    return posts.filter((post) => {
      const postDate = new Date(post.scheduledDate);
      return (
        postDate.getDate() === date.getDate() &&
        postDate.getMonth() === date.getMonth() &&
        postDate.getFullYear() === date.getFullYear()
      );
    });
  };

  // Check if date is release date
  const isReleaseDate = (date: Date) => {
    return (
      date.getDate() === releaseDate.getDate() &&
      date.getMonth() === releaseDate.getMonth() &&
      date.getFullYear() === releaseDate.getFullYear()
    );
  };

  // Navigate months
  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  // Add new post
  const handleAddPost = () => {
    if (!selectedDate || !newPost.caption) return;

    const post: ScheduledPost = {
      id: generateId(),
      platform: newPost.platform as Platform,
      contentType: newPost.contentType as ContentType,
      caption: newPost.caption,
      mediaUrl: newPost.mediaUrl,
      scheduledDate: selectedDate,
      scheduledTime: newPost.scheduledTime || "19:00",
      status: "draft",
      hashtags: newPost.hashtags || [],
      notes: newPost.notes,
    };

    const updatedPosts = [...posts, post];
    setPosts(updatedPosts);
    onPostsChange?.(updatedPosts);
    setIsAddingPost(false);
    setNewPost({
      platform: "instagram",
      contentType: "reel",
      caption: "",
      scheduledTime: "19:00",
      hashtags: [],
      status: "draft",
    });
  };

  // Delete post
  const handleDeletePost = (postId: string) => {
    const updatedPosts = posts.filter((p) => p.id !== postId);
    setPosts(updatedPosts);
    onPostsChange?.(updatedPosts);
  };

  // Generate campaign from templates
  const generateCampaign = () => {
    const newPosts: ScheduledPost[] = POST_TEMPLATES.map((template) => {
      const postDate = new Date(releaseDate);
      postDate.setDate(postDate.getDate() - template.daysBeforeRelease);

      const caption = template.caption
        .replace("{title}", releaseTitle)
        .replace("{date}", releaseDate.toLocaleDateString("es-MX", { day: "numeric", month: "long" }));

      return {
        id: generateId(),
        platform: template.platform,
        contentType: template.contentType,
        caption,
        scheduledDate: postDate,
        scheduledTime: template.time,
        status: "draft" as PostStatus,
        hashtags: [],
        notes: template.name,
      };
    });

    setPosts(newPosts);
    onPostsChange?.(newPosts);
  };

  // Copy caption to clipboard
  const copyCaption = async (caption: string) => {
    await navigator.clipboard.writeText(caption);
  };

  const monthName = currentMonth.toLocaleDateString("es-MX", { month: "long", year: "numeric" });

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-oswald text-xl uppercase flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary" />
            Calendario de Publicaciones
          </h3>
          <p className="text-sm text-slc-muted mt-1">
            Planifica tu campaña de pre-save
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generateCampaign}>
            <Sparkles className="w-4 h-4 mr-2" />
            Generar Campaña
          </Button>
        </div>
      </div>

      {/* Release date info */}
      <div className="p-4 bg-primary/10 border border-primary/20 rounded-xl flex items-center gap-4">
        <div className="p-3 rounded-lg bg-primary/20">
          <Rocket className="w-6 h-6 text-primary" />
        </div>
        <div>
          <p className="font-oswald uppercase text-sm text-primary">Fecha de Lanzamiento</p>
          <p className="font-medium">
            {releaseDate.toLocaleDateString("es-MX", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Calendar */}
      <div className="bg-slc-card border border-slc-border rounded-xl p-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" onClick={prevMonth}>
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <h4 className="font-oswald text-lg uppercase">{monthName}</h4>
          <Button variant="ghost" size="icon" onClick={nextMonth}>
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((day) => (
            <div key={day} className="text-center text-xs text-slc-muted font-medium py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((date, index) => {
            if (!date) {
              return <div key={index} className="aspect-square" />;
            }

            const dayPosts = getPostsForDate(date);
            const isRelease = isReleaseDate(date);
            const isSelected = selectedDate?.toDateString() === date.toDateString();
            const isToday = new Date().toDateString() === date.toDateString();
            const isPast = date < new Date(new Date().setHours(0, 0, 0, 0));

            return (
              <button
                key={index}
                type="button"
                onClick={() => {
                  setSelectedDate(date);
                  setIsAddingPost(false);
                }}
                className={`aspect-square p-1 rounded-lg text-sm relative transition-all ${
                  isSelected
                    ? "bg-primary text-white"
                    : isRelease
                    ? "bg-green-500/20 text-green-500 border border-green-500/30"
                    : isToday
                    ? "bg-primary/10 text-primary"
                    : isPast
                    ? "text-slc-muted/50"
                    : "hover:bg-slc-dark text-white"
                }`}
              >
                <span className="font-medium">{date.getDate()}</span>

                {/* Post indicators */}
                {dayPosts.length > 0 && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayPosts.slice(0, 3).map((post, i) => {
                      const platform = PLATFORMS.find((p) => p.id === post.platform);
                      return (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${platform?.color || "bg-slc-muted"}`}
                        />
                      );
                    })}
                    {dayPosts.length > 3 && (
                      <span className="text-[8px] text-slc-muted">+{dayPosts.length - 3}</span>
                    )}
                  </div>
                )}

                {/* Release indicator */}
                {isRelease && (
                  <div className="absolute -top-1 -right-1">
                    <Rocket className="w-3 h-3 text-green-500" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected date posts */}
      {selectedDate && (
        <div className="bg-slc-dark border border-slc-border rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-oswald text-lg uppercase">
              {selectedDate.toLocaleDateString("es-MX", {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </h4>
            <Button size="sm" onClick={() => setIsAddingPost(true)}>
              <Plus className="w-4 h-4 mr-1" />
              Agregar Post
            </Button>
          </div>

          {/* Posts for selected date */}
          {getPostsForDate(selectedDate).length > 0 ? (
            <div className="space-y-3">
              {getPostsForDate(selectedDate).map((post) => {
                const platform = PLATFORMS.find((p) => p.id === post.platform);
                const contentType = CONTENT_TYPES.find((c) => c.id === post.contentType);

                return (
                  <div
                    key={post.id}
                    className="p-4 bg-slc-card rounded-lg border border-slc-border space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${platform?.color} text-white`}>
                          {platform?.icon}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{platform?.name}</span>
                            <span className="text-xs text-slc-muted flex items-center gap-1">
                              {contentType?.icon}
                              {contentType?.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slc-muted">
                            <Clock className="w-3 h-3" />
                            {post.scheduledTime}
                            {post.notes && (
                              <>
                                <span>•</span>
                                <span>{post.notes}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => copyCaption(post.caption)}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500"
                          onClick={() => handleDeletePost(post.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <p className="text-sm whitespace-pre-wrap bg-slc-dark p-3 rounded-lg">
                      {post.caption}
                    </p>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-xs ${
                          post.status === "published"
                            ? "bg-green-500/10 text-green-500"
                            : post.status === "scheduled"
                            ? "bg-blue-500/10 text-blue-500"
                            : post.status === "failed"
                            ? "bg-red-500/10 text-red-500"
                            : "bg-slc-muted/10 text-slc-muted"
                        }`}
                      >
                        {post.status === "draft" && "Borrador"}
                        {post.status === "scheduled" && "Programado"}
                        {post.status === "published" && "Publicado"}
                        {post.status === "failed" && "Error"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : !isAddingPost ? (
            <div className="text-center py-8 text-slc-muted">
              <Calendar className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No hay posts programados para este día</p>
            </div>
          ) : null}

          {/* Add post form */}
          {isAddingPost && (
            <div className="p-4 bg-slc-card rounded-lg border border-primary/20 space-y-4">
              <h5 className="font-oswald uppercase text-sm">Nuevo Post</h5>

              {/* Platform selection */}
              <div>
                <label className="block text-xs text-slc-muted mb-2">Plataforma</label>
                <div className="flex flex-wrap gap-2">
                  {PLATFORMS.map((platform) => (
                    <button
                      key={platform.id}
                      type="button"
                      onClick={() => setNewPost({ ...newPost, platform: platform.id })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        newPost.platform === platform.id
                          ? "border-primary bg-primary/10"
                          : "border-slc-border hover:border-primary/50"
                      }`}
                    >
                      <span className={`p-1 rounded ${platform.color} text-white`}>
                        {platform.icon}
                      </span>
                      <span className="text-sm">{platform.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Content type */}
              <div>
                <label className="block text-xs text-slc-muted mb-2">Tipo de contenido</label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setNewPost({ ...newPost, contentType: type.id })}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${
                        newPost.contentType === type.id
                          ? "border-primary bg-primary/10"
                          : "border-slc-border hover:border-primary/50"
                      }`}
                    >
                      {type.icon}
                      <span className="text-sm">{type.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time */}
              <div>
                <label className="block text-xs text-slc-muted mb-2">Hora</label>
                <input
                  type="time"
                  value={newPost.scheduledTime || "19:00"}
                  onChange={(e) => setNewPost({ ...newPost, scheduledTime: e.target.value })}
                  className="px-3 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Caption */}
              <div>
                <label className="block text-xs text-slc-muted mb-2">Caption</label>
                <textarea
                  value={newPost.caption || ""}
                  onChange={(e) => setNewPost({ ...newPost, caption: e.target.value })}
                  placeholder="Escribe tu caption aquí..."
                  rows={4}
                  className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary resize-none text-sm"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs text-slc-muted mb-2">Notas (opcional)</label>
                <input
                  type="text"
                  value={newPost.notes || ""}
                  onChange={(e) => setNewPost({ ...newPost, notes: e.target.value })}
                  placeholder="ej: Teaser inicial, Behind the scenes..."
                  className="w-full px-3 py-2 bg-slc-dark border border-slc-border rounded-lg focus:outline-none focus:border-primary text-sm"
                />
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button onClick={handleAddPost} disabled={!newPost.caption}>
                  <Check className="w-4 h-4 mr-1" />
                  Guardar
                </Button>
                <Button variant="ghost" onClick={() => setIsAddingPost(false)}>
                  <X className="w-4 h-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Campaign summary */}
      {posts.length > 0 && (
        <div className="p-4 bg-slc-card rounded-xl border border-slc-border">
          <h4 className="font-oswald text-sm uppercase mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            Resumen de Campaña
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {PLATFORMS.map((platform) => {
              const count = posts.filter((p) => p.platform === platform.id).length;
              return (
                <div
                  key={platform.id}
                  className="p-3 bg-slc-dark rounded-lg text-center"
                >
                  <div className={`w-8 h-8 mx-auto rounded-lg ${platform.color} flex items-center justify-center text-white mb-2`}>
                    {platform.icon}
                  </div>
                  <p className="text-lg font-oswald">{count}</p>
                  <p className="text-xs text-slc-muted">{platform.name}</p>
                </div>
              );
            })}
          </div>
          <div className="mt-4 pt-4 border-t border-slc-border flex items-center justify-between">
            <span className="text-sm text-slc-muted">Total: {posts.length} posts programados</span>
            <Button variant="outline" size="sm">
              <Bell className="w-4 h-4 mr-2" />
              Configurar recordatorios
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SocialCalendar;
