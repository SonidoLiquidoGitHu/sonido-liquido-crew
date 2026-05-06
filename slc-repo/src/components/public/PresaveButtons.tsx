"use client";

import { ExternalLink } from "lucide-react";

interface PresaveLink {
  rpm?: string | null;
  spotify?: string | null;
  appleMusic?: string | null;
  deezer?: string | null;
  tidal?: string | null;
  amazonMusic?: string | null;
  youtubeMusic?: string | null;
}

interface PresaveButtonsProps {
  links: PresaveLink;
}

// Platform Icons as SVG components
function SpotifyIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
    </svg>
  );
}

function AppleMusicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.994 6.124a9.23 9.23 0 00-.24-2.19c-.317-1.31-1.062-2.31-2.18-3.043a5.022 5.022 0 00-1.877-.726 10.496 10.496 0 00-1.564-.15c-.04-.003-.083-.01-.124-.013H5.986c-.152.01-.303.017-.455.026-.747.043-1.49.123-2.193.4-1.336.53-2.3 1.452-2.865 2.78-.192.448-.292.925-.363 1.408-.056.392-.088.785-.1 1.18 0 .032-.007.062-.01.093v12.223c.01.14.017.283.027.424.05.815.154 1.624.497 2.373.65 1.42 1.738 2.353 3.234 2.801.42.127.856.187 1.293.228.555.053 1.11.06 1.667.06h11.03c.525 0 1.048-.034 1.57-.1.823-.106 1.597-.35 2.296-.81a5.046 5.046 0 001.88-2.207c.186-.42.293-.87.37-1.324.113-.675.138-1.358.137-2.04-.002-3.8 0-7.595-.003-11.393zm-6.423 3.99v5.712c0 .417-.058.827-.244 1.206-.29.59-.76.962-1.388 1.14-.35.1-.706.157-1.07.173-.95.042-1.873-.6-2.12-1.65-.297-1.262.725-2.456 2.01-2.57.415-.037.83-.003 1.242-.098.34-.078.48-.263.506-.608.003-.067.003-.135.003-.202V8.343c0-.4 0-.4-.393-.33l-4.69.9c-.09.017-.18.04-.268.067-.19.06-.268.18-.27.38v7.42c0 .2-.01.4-.038.598-.085.59-.348 1.07-.87 1.385-.368.222-.775.336-1.2.396-.73.105-1.43.022-2.063-.39-.596-.388-.94-.953-.975-1.675-.047-.932.453-1.706 1.32-2.04.44-.17.9-.25 1.37-.29.31-.023.62-.004.932-.065.32-.063.472-.236.504-.56.004-.047.003-.095.003-.143V6.668c0-.12.013-.24.033-.356.058-.34.26-.49.596-.56l5.783-1.11c.205-.04.413-.06.622-.058.34.004.507.168.516.508.004.106 0 .212 0 .318v4.702z"/>
    </svg>
  );
}

function DeezerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M18.81 4.16v3.03H24V4.16h-5.19zM6.27 8.38v3.027h5.189V8.38h-5.19zm12.54 0v3.027H24V8.38h-5.19zM6.27 12.59v3.027h5.189V12.59h-5.19zm6.27 0v3.027h5.19V12.59h-5.19zm6.27 0v3.027H24V12.59h-5.19zM0 16.81v3.029h5.19V16.81H0zm6.27 0v3.029h5.189V16.81h-5.19zm6.27 0v3.029h5.19V16.81h-5.19zm6.27 0v3.029H24V16.81h-5.19z"/>
    </svg>
  );
}

function TidalIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12.012 3.992L8.008 7.996 4.004 3.992 0 7.996l4.004 4.004-4.004 4.004 4.004 4.004 4.004-4.004-4.004-4.004 4.004-4.004 4.004 4.004-4.004 4.004 4.004 4.004 4.004-4.004-4.004-4.004 4.004-4.004-4.004-4.004zm.008 8l4.004-4.004 4-4 4 4-4 4.004 4 4.004-4 4.004-4.004-4.004-3.992-4.004-.008-.008z"/>
    </svg>
  );
}

function AmazonMusicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M23.77 16.67C23.77 18.28 22.07 21.73 17.74 21.73C11.37 21.73 8.04 18.52 8.04 18.52L9.53 16.76C9.53 16.76 12.43 19.49 17.37 19.49C20.44 19.49 21.53 17.65 21.53 16.67C21.53 14.57 18.43 13.62 16.37 12.83C13.08 11.6 9.66 10.27 9.66 6.5C9.66 3.78 12.45 2.27 15.74 2.27C19.97 2.27 22.65 4.56 22.65 4.56L21.29 6.47C21.29 6.47 18.87 4.51 15.74 4.51C13.46 4.51 11.89 5.47 11.89 6.5C11.89 8.44 14.46 9.25 16.87 10.13C20.53 11.47 23.77 12.93 23.77 16.67Z"/>
    </svg>
  );
}

function YoutubeMusicIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor">
      <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm0 19.104c-3.924 0-7.104-3.18-7.104-7.104S8.076 4.896 12 4.896s7.104 3.18 7.104 7.104-3.18 7.104-7.104 7.104zm0-13.332c-3.432 0-6.228 2.796-6.228 6.228S8.568 18.228 12 18.228 18.228 15.432 18.228 12 15.432 5.772 12 5.772zM9.684 15.54V8.46L15.816 12l-6.132 3.54z"/>
    </svg>
  );
}

const platforms = [
  {
    key: "spotify",
    name: "Spotify",
    Icon: SpotifyIcon,
    bgColor: "bg-[#1DB954] hover:bg-[#1ed760]",
    textColor: "text-black",
  },
  {
    key: "appleMusic",
    name: "Apple Music",
    Icon: AppleMusicIcon,
    bgColor: "bg-gradient-to-r from-[#FA233B] to-[#FB5C74] hover:from-[#FB3045] hover:to-[#FC6C84]",
    textColor: "text-white",
  },
  {
    key: "deezer",
    name: "Deezer",
    Icon: DeezerIcon,
    bgColor: "bg-[#00C7F2] hover:bg-[#00D4FF]",
    textColor: "text-black",
  },
  {
    key: "tidal",
    name: "Tidal",
    Icon: TidalIcon,
    bgColor: "bg-[#000000] hover:bg-[#1a1a1a] border border-white/20",
    textColor: "text-white",
  },
  {
    key: "amazonMusic",
    name: "Amazon Music",
    Icon: AmazonMusicIcon,
    bgColor: "bg-gradient-to-r from-[#00A8E1] to-[#3CD7EB] hover:from-[#00B8F1] hover:to-[#4CE7FB]",
    textColor: "text-white",
  },
  {
    key: "youtubeMusic",
    name: "YouTube Music",
    Icon: YoutubeMusicIcon,
    bgColor: "bg-[#FF0000] hover:bg-[#FF2222]",
    textColor: "text-white",
  },
];

export function PresaveButtons({ links }: PresaveButtonsProps) {
  const availablePlatforms = platforms.filter(
    (p) => links[p.key as keyof PresaveLink]
  );

  if (availablePlatforms.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <p className="text-white/60 text-sm uppercase tracking-wider text-center lg:text-left">
        Presave en tu plataforma favorita
      </p>
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
        {availablePlatforms.map((platform) => (
          <a
            key={platform.key}
            href={links[platform.key as keyof PresaveLink] || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-5 py-3 rounded-xl ${platform.bgColor} ${platform.textColor} font-medium transition-all hover:scale-105 hover:shadow-lg`}
          >
            <platform.Icon className="w-5 h-5" />
            <span>{platform.name}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
