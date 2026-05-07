"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Share2,
  Copy,
  Check,
  X,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Social media icons as SVG
function TwitterIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
    </svg>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

function TelegramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  );
}

interface ShareButtonProps {
  url?: string;
  title: string;
  description?: string;
  hashtags?: string[];
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showLabel?: boolean;
}

export function ShareButton({
  url,
  title,
  description = "",
  hashtags = [],
  className,
  variant = "outline",
  size = "default",
  showLabel = true,
}: ShareButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  // Use current URL if not provided
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDescription = encodeURIComponent(description);
  const hashtagString = hashtags.length > 0 ? hashtags.join(",") : "";

  const shareLinks = [
    {
      name: "X (Twitter)",
      icon: TwitterIcon,
      url: `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}${hashtagString ? `&hashtags=${hashtagString}` : ""}`,
      color: "hover:bg-black hover:text-white",
    },
    {
      name: "Facebook",
      icon: FacebookIcon,
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedTitle}`,
      color: "hover:bg-[#1877F2] hover:text-white",
    },
    {
      name: "WhatsApp",
      icon: WhatsAppIcon,
      url: `https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`,
      color: "hover:bg-[#25D366] hover:text-white",
    },
    {
      name: "Telegram",
      icon: TelegramIcon,
      url: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      color: "hover:bg-[#0088cc] hover:text-white",
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: description,
          url: shareUrl,
        });
      } catch (err) {
        // User cancelled or error
        console.log("Share cancelled");
      }
    } else {
      setIsOpen(true);
    }
  };

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        onClick={handleNativeShare}
        className={cn("gap-2", className)}
      >
        <Share2 className="w-4 h-4" />
        {showLabel && <span>Compartir</span>}
      </Button>

      {/* Share Modal/Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50"
            onClick={() => setIsOpen(false)}
          />

          {/* Modal */}
          <div className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-sm bg-slc-dark border border-slc-border rounded-2xl p-6 shadow-2xl sm:absolute sm:inset-auto sm:top-full sm:right-0 sm:mt-2 sm:translate-y-0">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-oswald text-lg uppercase">Compartir</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-full hover:bg-slc-card transition-colors"
              >
                <X className="w-5 h-5 text-slc-muted" />
              </button>
            </div>

            {/* Title preview */}
            <p className="text-sm text-slc-muted mb-4 line-clamp-2">{title}</p>

            {/* Share buttons grid */}
            <div className="grid grid-cols-4 gap-3 mb-4">
              {shareLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "flex flex-col items-center gap-2 p-3 rounded-xl bg-slc-card border border-slc-border transition-all",
                    link.color
                  )}
                >
                  <link.icon className="w-6 h-6" />
                  <span className="text-xs">{link.name.split(" ")[0]}</span>
                </a>
              ))}
            </div>

            {/* Copy link */}
            <button
              onClick={copyToClipboard}
              className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-slc-card border border-slc-border hover:border-primary transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-5 h-5 text-green-500" />
                  <span className="text-green-500">Enlace copiado</span>
                </>
              ) : (
                <>
                  <Copy className="w-5 h-5" />
                  <span>Copiar enlace</span>
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// Compact share buttons for inline use
export function ShareButtons({
  url,
  title,
  className,
}: {
  url?: string;
  title: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const shareUrl = url || (typeof window !== "undefined" ? window.location.href : "");
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <a
        href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-slc-card border border-slc-border hover:bg-black hover:text-white hover:border-black transition-all"
        title="Compartir en X"
      >
        <TwitterIcon className="w-4 h-4" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-slc-card border border-slc-border hover:bg-[#1877F2] hover:text-white hover:border-[#1877F2] transition-all"
        title="Compartir en Facebook"
      >
        <FacebookIcon className="w-4 h-4" />
      </a>
      <a
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`}
        target="_blank"
        rel="noopener noreferrer"
        className="p-2 rounded-full bg-slc-card border border-slc-border hover:bg-[#25D366] hover:text-white hover:border-[#25D366] transition-all"
        title="Compartir en WhatsApp"
      >
        <WhatsAppIcon className="w-4 h-4" />
      </a>
      <button
        onClick={copyToClipboard}
        className="p-2 rounded-full bg-slc-card border border-slc-border hover:bg-primary hover:text-white hover:border-primary transition-all"
        title="Copiar enlace"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}
