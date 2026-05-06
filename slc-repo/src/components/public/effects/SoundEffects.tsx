"use client";

import { useEffect, useRef, useCallback, createContext, useContext, useState, type ReactNode } from "react";

// Sound effect types
type SoundType = "hover" | "click" | "success" | "whoosh";

interface SoundContextType {
  playSound: (type: SoundType) => void;
  isMuted: boolean;
  toggleMute: () => void;
}

const SoundContext = createContext<SoundContextType | null>(null);

// Base64 encoded short sounds (tiny audio clips)
const SOUNDS = {
  // Short high-frequency blip for hover
  hover: "data:audio/wav;base64,UklGRl4AAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YToAAAAAAAAAgH+AfwAAAACA/3+A/wAAgH+Af4B/AACA/4B/f4AAAH9/gH+AgAB/f4B/gIAAAH+Af4CAAH9/f4CAgAA=",
  // Slightly deeper click sound
  click: "data:audio/wav;base64,UklGRnoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YVYAAABkZGRkY2JhX11aV1RST0xJRkNAPTs4NTIwLSspJyUjIR8dGxkXFhQTEhEQDw4NDAsKCQgHBgUEAwIBAAABAgMEBQYHCAkKCwwNDg8QERITFBUX",
  // Success chime
  success: "data:audio/wav;base64,UklGRqYAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YYIAAACAgICAgICAgH9/f39/f4CAgICBgYGBgoKCgoODg4OEhISEhYWFhYaGhoaHh4eHiIiIiImJiYmKioqKi4uLi4uLi4uKioqKiYmJiYiIiIiHh4eHhoaGhoWFhYWEhISEg4ODg4KCgoKBgYGBgICAgH9/f39/f39/",
  // Whoosh transition
  whoosh: "data:audio/wav;base64,UklGRqoAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YYYAAABAAEAAQABAf0B/QH9Af4B/gH+AgICAgYGBgYKCgoKDg4ODhISEhIWFhYWGhoaGh4eHh4iIiIiJiYmJioqKiouLi4uMjIyMjIyMjIuLi4uKioqKiYmJiYiIiIiHh4eHhoaGhoWFhYWEhISEg4ODg4KCgoKBgYGBgICAgH9/f39/f39/",
};

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioBuffersRef = useRef<Map<SoundType, AudioBuffer>>(new Map());
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize audio context on first user interaction
  const initAudio = useCallback(async () => {
    if (isInitialized) return;

    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current = new AudioContextClass();

      // Decode all sounds
      for (const [key, dataUri] of Object.entries(SOUNDS)) {
        try {
          const response = await fetch(dataUri);
          const arrayBuffer = await response.arrayBuffer();
          const audioBuffer = await audioContextRef.current.decodeAudioData(arrayBuffer);
          audioBuffersRef.current.set(key as SoundType, audioBuffer);
        } catch (e) {
          console.warn(`Failed to load sound: ${key}`);
        }
      }

      setIsInitialized(true);
    } catch (e) {
      console.warn("Web Audio API not supported");
    }
  }, [isInitialized]);

  // Initialize on first click/touch
  useEffect(() => {
    const handleInteraction = () => {
      initAudio();
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };

    window.addEventListener("click", handleInteraction);
    window.addEventListener("touchstart", handleInteraction);

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("touchstart", handleInteraction);
    };
  }, [initAudio]);

  const playSound = useCallback((type: SoundType) => {
    if (isMuted || !audioContextRef.current || !isInitialized) return;

    const buffer = audioBuffersRef.current.get(type);
    if (!buffer) return;

    try {
      const source = audioContextRef.current.createBufferSource();
      const gainNode = audioContextRef.current.createGain();

      source.buffer = buffer;

      // Set volume based on sound type
      const volumes: Record<SoundType, number> = {
        hover: 0.08,
        click: 0.15,
        success: 0.2,
        whoosh: 0.1,
      };
      gainNode.gain.value = volumes[type];

      source.connect(gainNode);
      gainNode.connect(audioContextRef.current.destination);

      source.start(0);
    } catch (e) {
      // Ignore playback errors
    }
  }, [isMuted, isInitialized]);

  const toggleMute = useCallback(() => {
    setIsMuted((prev) => !prev);
  }, []);

  return (
    <SoundContext.Provider value={{ playSound, isMuted, toggleMute }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundEffects() {
  const context = useContext(SoundContext);
  if (!context) {
    // Return no-op functions if not in provider
    return {
      playSound: () => {},
      isMuted: true,
      toggleMute: () => {},
    };
  }
  return context;
}

// Hook to automatically add hover sounds to elements
export function useHoverSound(ref: React.RefObject<HTMLElement | null>) {
  const { playSound } = useSoundEffects();

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleMouseEnter = () => playSound("hover");
    const handleClick = () => playSound("click");

    element.addEventListener("mouseenter", handleMouseEnter);
    element.addEventListener("click", handleClick);

    return () => {
      element.removeEventListener("mouseenter", handleMouseEnter);
      element.removeEventListener("click", handleClick);
    };
  }, [ref, playSound]);
}

// Component wrapper for sound-enabled elements
interface SoundButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  hoverSound?: SoundType;
  clickSound?: SoundType;
}

export function SoundButton({
  children,
  hoverSound = "hover",
  clickSound = "click",
  onMouseEnter,
  onClick,
  ...props
}: SoundButtonProps) {
  const { playSound } = useSoundEffects();

  const handleMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
    playSound(hoverSound);
    onMouseEnter?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    playSound(clickSound);
    onClick?.(e);
  };

  return (
    <button onMouseEnter={handleMouseEnter} onClick={handleClick} {...props}>
      {children}
    </button>
  );
}

// Sound toggle button
export function SoundToggle() {
  const { isMuted, toggleMute, playSound } = useSoundEffects();

  const handleToggle = () => {
    toggleMute();
    if (isMuted) {
      // Will be unmuted after toggle, play confirmation
      setTimeout(() => playSound("success"), 50);
    }
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed bottom-4 right-4 z-50 p-3 bg-slc-card/80 backdrop-blur-sm border border-slc-border rounded-full hover:bg-slc-card hover:border-primary/50 transition-all group"
      aria-label={isMuted ? "Activar sonidos" : "Silenciar sonidos"}
    >
      {isMuted ? (
        <svg className="w-5 h-5 text-slc-muted group-hover:text-white transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg className="w-5 h-5 text-primary group-hover:text-primary transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}
