"use client";

import { useState, useEffect } from "react";

interface CountdownTimerProps {
  targetDate: string;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownTimer({ targetDate }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    function calculateTimeLeft() {
      const difference = new Date(targetDate).getTime() - Date.now();

      if (difference <= 0) {
        return { days: 0, hours: 0, minutes: 0, seconds: 0 };
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    }

    setTimeLeft(calculateTimeLeft());

    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center lg:justify-start gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center p-4 bg-white/10 backdrop-blur-sm rounded-xl min-w-[80px]"
          >
            <div className="h-8 w-12 bg-white/20 rounded animate-pulse" />
            <div className="h-3 w-8 bg-white/10 rounded mt-2 animate-pulse" />
          </div>
        ))}
      </div>
    );
  }

  const timeUnits = [
    { value: timeLeft.days, label: "Días" },
    { value: timeLeft.hours, label: "Horas" },
    { value: timeLeft.minutes, label: "Min" },
    { value: timeLeft.seconds, label: "Seg" },
  ];

  const isExpired = timeLeft.days === 0 && timeLeft.hours === 0 && timeLeft.minutes === 0 && timeLeft.seconds === 0;

  if (isExpired) {
    return null;
  }

  return (
    <div className="flex items-center justify-center lg:justify-start gap-3 sm:gap-4">
      {timeUnits.map((unit, index) => (
        <div key={unit.label} className="relative">
          <div
            className="flex flex-col items-center px-4 py-4 sm:px-6 sm:py-5 bg-white/10 backdrop-blur-sm rounded-xl min-w-[70px] sm:min-w-[90px] border border-white/10 hover:border-white/20 transition-colors"
          >
            <span className="font-oswald text-3xl sm:text-4xl lg:text-5xl text-white tabular-nums">
              {String(unit.value).padStart(2, "0")}
            </span>
            <span className="text-xs sm:text-sm text-white/60 uppercase tracking-wider mt-1">
              {unit.label}
            </span>
          </div>

          {/* Separator */}
          {index < timeUnits.length - 1 && (
            <span className="absolute -right-2 top-1/2 -translate-y-1/2 text-white/30 text-2xl font-light hidden sm:block">
              :
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
