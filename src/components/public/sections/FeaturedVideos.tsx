import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { VideoCard } from "../cards/VideoCard";
import type { Video } from "@/types";
import { Button } from "@/components/ui/button";

interface FeaturedVideosProps {
  videos: Video[];
}

export function FeaturedVideos({ videos }: FeaturedVideosProps) {
  if (!videos.length) return null;

  // Get featured video (first one) and rest for sidebar
  const [featuredVideo, ...restVideos] = videos;
  const sidebarVideos = restVideos.slice(0, 3);

  return (
    <section className="py-20 bg-slc-darker">
      <div className="section-container">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-12">
          <div>
            <h2 className="section-title text-left">Videos</h2>
            <p className="section-subtitle text-left mt-2">
              Videos oficiales, freestyles y sesiones en vivo
            </p>
          </div>
          <Button asChild variant="outline" className="shrink-0">
            <Link href="/videos">
              Ver todos
              <ArrowRight className="w-4 h-4 ml-2" />
            </Link>
          </Button>
        </div>

        {/* Videos Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Featured Video */}
          <div className="lg:col-span-2">
            <VideoCard video={featuredVideo} />
          </div>

          {/* Sidebar Videos */}
          <div className="space-y-4">
            {sidebarVideos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
