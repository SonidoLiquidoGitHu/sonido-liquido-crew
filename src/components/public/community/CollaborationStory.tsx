"use client";

import { useState } from "react";
import { SafeImage } from "@/components/ui/safe-image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Users,
  Music,
  Mic2,
  Headphones,
  Disc,
  Camera,
  Play,
  Quote,
  ExternalLink,
  Instagram,
  Twitter,
  Globe,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Collaborator {
  id: string;
  name: string;
  role: string;
  artistId?: string;
  photoUrl?: string;
  spotifyUrl?: string;
  instagramUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  contribution?: string;
  quote?: string;
}

interface StoryMedia {
  id: string;
  mediaType: "image" | "video" | "audio";
  url: string;
  thumbnailUrl?: string;
  caption?: string;
  width?: number;
  height?: number;
  duration?: number;
}

interface CollaborationStoryProps {
  releaseTitle: string;
  releaseArtist: string;
  releaseCoverUrl?: string;
  releaseSpotifyUrl?: string;
  story?: string;
  collaborators?: Collaborator[];
  media?: StoryMedia[];
  className?: string;
}

// Role icons mapping
const roleIcons: Record<string, typeof Music> = {
  producer: Headphones,
  songwriter: Music,
  engineer: Disc,
  mixer: Disc,
  master: Disc,
  featured: Mic2,
  vocals: Mic2,
  default: User,
};

// Role labels in Spanish
const roleLabels: Record<string, string> = {
  producer: "Productor",
  songwriter: "Compositor",
  engineer: "Ingeniero de sonido",
  mixer: "Mezcla",
  master: "Masterización",
  featured: "Colaborador",
  vocals: "Voces",
};

export function CollaborationStory({
  releaseTitle,
  releaseArtist,
  releaseCoverUrl,
  releaseSpotifyUrl,
  story,
  collaborators = [],
  media = [],
  className = "",
}: CollaborationStoryProps) {
  const [selectedMediaIndex, setSelectedMediaIndex] = useState<number | null>(null);
  const [expandedQuotes, setExpandedQuotes] = useState<string[]>([]);

  // Group collaborators by role
  const groupedCollaborators = collaborators.reduce((acc, collab) => {
    const role = collab.role.toLowerCase();
    if (!acc[role]) acc[role] = [];
    acc[role].push(collab);
    return acc;
  }, {} as Record<string, Collaborator[]>);

  const toggleQuote = (id: string) => {
    setExpandedQuotes((prev) =>
      prev.includes(id) ? prev.filter((q) => q !== id) : [...prev, id]
    );
  };

  const navigateMedia = (direction: "prev" | "next") => {
    if (selectedMediaIndex === null) return;
    const newIndex =
      direction === "prev"
        ? Math.max(0, selectedMediaIndex - 1)
        : Math.min(media.length - 1, selectedMediaIndex + 1);
    setSelectedMediaIndex(newIndex);
  };

  return (
    <div className={cn("bg-slc-card border border-slc-border rounded-2xl overflow-hidden", className)}>
      {/* Header with release info */}
      <div className="relative p-6 border-b border-slc-border">
        {/* Background blur */}
        {releaseCoverUrl && (
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={releaseCoverUrl}
              alt=""
              className="w-full h-full object-cover blur-3xl opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-slc-card to-slc-card" />
          </div>
        )}

        <div className="relative flex items-center gap-4">
          {/* Cover */}
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-slc-dark flex-shrink-0 shadow-lg">
            {releaseCoverUrl ? (
              <img
                src={releaseCoverUrl}
                alt={releaseTitle}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Music className="w-8 h-8 text-slc-muted" />
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-medium text-primary uppercase tracking-wider">
                Historia del Lanzamiento
              </span>
            </div>
            <h2 className="font-oswald text-2xl uppercase text-white truncate">
              {releaseTitle}
            </h2>
            <p className="text-sm text-slc-muted">{releaseArtist}</p>
          </div>

          {releaseSpotifyUrl && (
            <Button asChild variant="outline" size="sm" className="shrink-0">
              <a href={releaseSpotifyUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Escuchar
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Story text */}
      {story && (
        <div className="p-6 border-b border-slc-border">
          <h3 className="font-oswald text-lg uppercase text-white mb-4 flex items-center gap-2">
            <Quote className="w-5 h-5 text-primary" />
            La Historia
          </h3>
          <div
            className="prose prose-sm prose-invert max-w-none text-slc-muted leading-relaxed"
            dangerouslySetInnerHTML={{ __html: story }}
          />
        </div>
      )}

      {/* Collaborators */}
      {collaborators.length > 0 && (
        <div className="p-6 border-b border-slc-border">
          <h3 className="font-oswald text-lg uppercase text-white mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Créditos y Colaboradores
          </h3>

          <div className="space-y-8">
            {Object.entries(groupedCollaborators).map(([role, members]) => {
              const RoleIcon = roleIcons[role] || roleIcons.default;
              const roleLabel = roleLabels[role] || role.charAt(0).toUpperCase() + role.slice(1);

              return (
                <div key={role}>
                  {/* Role header */}
                  <div className="flex items-center gap-2 mb-3">
                    <RoleIcon className="w-4 h-4 text-slc-muted" />
                    <span className="text-sm font-medium text-slc-muted uppercase tracking-wider">
                      {roleLabel}
                    </span>
                    <div className="flex-1 h-px bg-slc-border" />
                  </div>

                  {/* Members */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {members.map((collab) => (
                      <CollaboratorCard
                        key={collab.id}
                        collaborator={collab}
                        isExpanded={expandedQuotes.includes(collab.id)}
                        onToggleQuote={() => toggleQuote(collab.id)}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Behind the scenes media */}
      {media.length > 0 && (
        <div className="p-6">
          <h3 className="font-oswald text-lg uppercase text-white mb-6 flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Detrás de Escenas
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {media.map((item, index) => (
              <button
                key={item.id}
                onClick={() => setSelectedMediaIndex(index)}
                className="group relative aspect-square rounded-lg overflow-hidden bg-slc-dark"
              >
                {item.mediaType === "video" ? (
                  <>
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.caption || "Behind the scenes"}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="w-5 h-5 text-black ml-0.5" />
                      </div>
                    </div>
                  </>
                ) : (
                  <img
                    src={item.thumbnailUrl || item.url}
                    alt={item.caption || "Behind the scenes"}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                )}
                {item.caption && (
                  <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-xs text-white line-clamp-2">{item.caption}</p>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Lightbox for media */}
      {selectedMediaIndex !== null && media[selectedMediaIndex] && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm animate-in fade-in"
          onClick={() => setSelectedMediaIndex(null)}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              setSelectedMediaIndex(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Navigation */}
          {selectedMediaIndex > 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateMedia("prev");
              }}
              className="absolute left-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          {selectedMediaIndex < media.length - 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigateMedia("next");
              }}
              className="absolute right-4 w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 z-10"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}

          <div
            className="max-w-4xl max-h-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            {media[selectedMediaIndex].mediaType === "video" ? (
              <video
                src={media[selectedMediaIndex].url}
                controls
                autoPlay
                className="max-h-[70vh] rounded-lg"
              />
            ) : (
              <img
                src={media[selectedMediaIndex].url}
                alt={media[selectedMediaIndex].caption || ""}
                className="max-h-[70vh] object-contain rounded-lg"
              />
            )}
            {media[selectedMediaIndex].caption && (
              <p className="mt-4 text-center text-white/80 max-w-md">
                {media[selectedMediaIndex].caption}
              </p>
            )}
            <p className="mt-2 text-sm text-slc-muted">
              {selectedMediaIndex + 1} / {media.length}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// Collaborator card component
function CollaboratorCard({
  collaborator,
  isExpanded,
  onToggleQuote,
}: {
  collaborator: Collaborator;
  isExpanded: boolean;
  onToggleQuote: () => void;
}) {
  const hasLinks =
    collaborator.spotifyUrl ||
    collaborator.instagramUrl ||
    collaborator.twitterUrl ||
    collaborator.websiteUrl;

  return (
    <div className="bg-slc-dark rounded-xl p-4 hover:bg-slc-dark/80 transition-colors">
      <div className="flex items-start gap-3">
        {/* Photo */}
        <div className="w-12 h-12 rounded-full bg-slc-card overflow-hidden flex-shrink-0">
          {collaborator.photoUrl ? (
            <img
              src={collaborator.photoUrl}
              alt={collaborator.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-6 h-6 text-slc-muted" />
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-white truncate">{collaborator.name}</h4>
          {collaborator.contribution && (
            <p className="text-xs text-slc-muted mt-0.5 line-clamp-2">
              {collaborator.contribution}
            </p>
          )}

          {/* Social links */}
          {hasLinks && (
            <div className="flex items-center gap-2 mt-2">
              {collaborator.spotifyUrl && (
                <a
                  href={collaborator.spotifyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slc-muted hover:text-spotify transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                  </svg>
                </a>
              )}
              {collaborator.instagramUrl && (
                <a
                  href={collaborator.instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slc-muted hover:text-pink-500 transition-colors"
                >
                  <Instagram className="w-4 h-4" />
                </a>
              )}
              {collaborator.twitterUrl && (
                <a
                  href={collaborator.twitterUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slc-muted hover:text-blue-400 transition-colors"
                >
                  <Twitter className="w-4 h-4" />
                </a>
              )}
              {collaborator.websiteUrl && (
                <a
                  href={collaborator.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slc-muted hover:text-white transition-colors"
                >
                  <Globe className="w-4 h-4" />
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Quote */}
      {collaborator.quote && (
        <div className="mt-3">
          <button
            onClick={onToggleQuote}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Quote className="w-3 h-3" />
            {isExpanded ? "Ocultar cita" : "Ver cita"}
          </button>
          {isExpanded && (
            <p className="mt-2 text-sm text-white/80 italic pl-3 border-l-2 border-primary/30 animate-in fade-in slide-in-from-top-2 duration-200">
              "{collaborator.quote}"
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default CollaborationStory;
