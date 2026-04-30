interface YouTubeEmbedProps {
  videoId: string;
  autoplay?: boolean;
  muted?: boolean;
  controls?: boolean;
  title?: string;
}

export function YouTubeEmbed({
  videoId,
  autoplay = false,
  muted = false,
  controls = true,
  title = "YouTube video",
}: YouTubeEmbedProps) {
  const params = new URLSearchParams({
    autoplay: autoplay ? "1" : "0",
    mute: muted ? "1" : "0",
    controls: controls ? "1" : "0",
    rel: "0",
    modestbranding: "1",
  });

  return (
    <div className="youtube-embed">
      <iframe
        src={`https://www.youtube.com/embed/${videoId}?${params.toString()}`}
        width="100%"
        height="100%"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
        loading="lazy"
        title={title}
        className="w-full h-full"
      />
    </div>
  );
}
