"use client";

import { Instagram, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface InstagramEmbedProps {
  username: string;
  showHeader?: boolean;
  showFollowButton?: boolean;
  postsToShow?: number;
  className?: string;
}

export function InstagramEmbed({
  username,
  className,
}: InstagramEmbedProps) {
  // Clean username (remove @ if present)
  const cleanUsername = username.replace(/^@/, "");
  const instagramUrl = `https://www.instagram.com/${cleanUsername}/`;

  return (
    <div className={cn("relative", className)}>
      {/* Simple Instagram Link Card */}
      <a
        href={instagramUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between gap-4 p-5 bg-gradient-to-r from-purple-900/30 via-pink-900/20 to-orange-900/20 border border-white/10 rounded-xl hover:border-pink-500/50 transition-all duration-300"
      >
        <div className="flex items-center gap-4">
          {/* Instagram Icon */}
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-yellow-500 via-pink-500 to-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Instagram className="w-6 h-6 text-white" />
          </div>

          {/* Username */}
          <div>
            <h3 className="font-oswald text-lg uppercase text-white group-hover:text-pink-400 transition-colors">
              Instagram
            </h3>
            <p className="text-sm text-gray-400">@{cleanUsername}</p>
          </div>
        </div>

        {/* Follow Button */}
        <Button
          variant="outline"
          size="sm"
          className="border-pink-500/50 text-pink-400 hover:bg-pink-500/20 group-hover:border-pink-400"
        >
          <Instagram className="w-4 h-4 mr-2" />
          Seguir
          <ExternalLink className="w-3 h-3 ml-2 opacity-50" />
        </Button>
      </a>
    </div>
  );
}

// Keep the widget export for backwards compatibility
export function InstagramFeedWidget({
  username,
  className,
}: {
  username: string;
  widgetId?: string;
  className?: string;
}) {
  return <InstagramEmbed username={username} className={className} />;
}
