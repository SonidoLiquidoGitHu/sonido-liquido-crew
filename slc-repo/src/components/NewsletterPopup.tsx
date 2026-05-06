"use client";

import { useState, useEffect } from "react";
import { X, Mail, Gift, Download, Loader2, Check, Music2 } from "lucide-react";

interface NewsletterSettings {
  popupTitle: string;
  popupDescription: string;
  rewardTitle: string;
  rewardDescription: string;
  rewardFileUrl: string | null;
  rewardFileName: string | null;
}

interface RewardInfo {
  fileUrl: string;
  fileName: string;
  title: string;
}

export default function NewsletterPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState("");
  const [reward, setReward] = useState<RewardInfo | null>(null);
  const [settings, setSettings] = useState<NewsletterSettings | null>(null);

  useEffect(() => {
    // Check if popup was already shown in this session
    const hasSeenPopup = sessionStorage.getItem("newsletter_popup_shown");
    const hasSubscribed = localStorage.getItem("newsletter_subscribed");

    if (hasSeenPopup || hasSubscribed) {
      return;
    }

    // Fetch settings
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/newsletter/settings");
        const data = await res.json();
        if (data.success && data.settings) {
          setSettings(data.settings);
        }
      } catch (err) {
        console.error("Failed to fetch newsletter settings:", err);
      }
    };

    fetchSettings();

    // Show popup after 5 seconds
    const timer = setTimeout(() => {
      setIsOpen(true);
      sessionStorage.setItem("newsletter_popup_shown", "true");
    }, 5000);

    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name }),
      });

      const data = await res.json();

      if (data.success) {
        setIsSuccess(true);
        localStorage.setItem("newsletter_subscribed", "true");
        if (data.reward) {
          setReward(data.reward);
        }
      } else {
        setError(data.error || "Something went wrong");
      }
    } catch (err) {
      setError("Failed to subscribe. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownload = () => {
    if (reward?.fileUrl) {
      const link = document.createElement("a");
      link.href = reward.fileUrl;
      link.download = reward.fileName || "reward";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-zinc-900 rounded-2xl border border-zinc-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 z-10 p-1 rounded-full bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header decoration */}
        <div className="h-2 bg-gradient-to-r from-emerald-500 via-[#1DB954] to-emerald-500" />

        <div className="p-6">
          {!isSuccess ? (
            <>
              {/* Icon */}
              <div className="flex justify-center mb-4">
                <div className="relative">
                  <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-white" />
                  </div>
                  {settings?.rewardFileUrl && (
                    <div className="absolute -bottom-1 -right-1 h-8 w-8 rounded-full bg-amber-500 flex items-center justify-center border-2 border-zinc-900">
                      <Gift className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              {/* Title */}
              <h2 className="text-2xl font-bold text-white text-center mb-2">
                {settings?.popupTitle || "Join Our Newsletter"}
              </h2>

              {/* Description */}
              <p className="text-zinc-400 text-center text-sm mb-6">
                {settings?.popupDescription || "Get exclusive updates, new releases, and special content delivered to your inbox."}
              </p>

              {/* Reward teaser */}
              {settings?.rewardFileUrl && (
                <div className="bg-zinc-800/50 rounded-lg p-3 mb-6 border border-zinc-700">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                      <Gift className="h-5 w-5 text-amber-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {settings.rewardTitle || "Exclusive Content"}
                      </p>
                      <p className="text-xs text-zinc-400">
                        Subscribe to receive your free download!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <input
                    type="text"
                    placeholder="Your name (optional)"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>
                <div>
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full px-4 py-3 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
                  />
                </div>

                {error && (
                  <p className="text-red-400 text-sm text-center">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-[#1DB954] hover:bg-[#1ed760] text-black font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Subscribing...
                    </>
                  ) : (
                    <>
                      <Mail className="h-5 w-5" />
                      Subscribe Now
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-zinc-500 text-center mt-4">
                No spam, unsubscribe anytime.
              </p>
            </>
          ) : (
            /* Success state */
            <div className="text-center py-4">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-700 flex items-center justify-center">
                  <Check className="h-8 w-8 text-white" />
                </div>
              </div>

              <h2 className="text-2xl font-bold text-white mb-2">
                Welcome to the Crew!
              </h2>

              <p className="text-zinc-400 text-sm mb-6">
                Thanks for subscribing! You'll receive our latest updates.
              </p>

              {reward?.fileUrl && (
                <div className="bg-zinc-800/50 rounded-lg p-4 mb-6 border border-emerald-500/30">
                  <div className="flex items-center justify-center gap-3 mb-3">
                    <Gift className="h-6 w-6 text-amber-400" />
                    <p className="font-medium text-white">
                      {reward.title || "Your Reward"}
                    </p>
                  </div>
                  <button
                    onClick={handleDownload}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-lg transition-colors"
                  >
                    <Download className="h-5 w-5" />
                    Download Now
                  </button>
                  <p className="text-xs text-zinc-500 mt-2">
                    {reward.fileName}
                  </p>
                </div>
              )}

              <button
                onClick={handleClose}
                className="text-zinc-400 hover:text-white text-sm transition-colors"
              >
                Close this popup
              </button>
            </div>
          )}
        </div>

        {/* Footer decoration */}
        <div className="px-6 py-4 bg-zinc-800/50 border-t border-zinc-700">
          <div className="flex items-center justify-center gap-2 text-zinc-500">
            <Music2 className="h-4 w-4" />
            <span className="text-xs">Sonido Líquido Crew</span>
          </div>
        </div>
      </div>
    </div>
  );
}
