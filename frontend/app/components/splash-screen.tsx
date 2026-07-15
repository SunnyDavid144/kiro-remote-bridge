"use client";

import { useEffect, useState } from "react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "text" | "fade">("logo");

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("text"), 600);
    const t2 = setTimeout(() => setPhase("fade"), 1400);
    const t3 = setTimeout(onComplete, 1800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-primary)] transition-opacity duration-400 ${
        phase === "fade" ? "opacity-0" : "opacity-100"
      }`}
    >
      {/* Logo */}
      <div
        className={`transition-all duration-500 ${
          phase === "logo" ? "scale-90 opacity-0" : "scale-100 opacity-100"
        }`}
      >
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[var(--accent)]/20 to-[var(--accent)]/5 border border-[var(--accent)]/25 flex items-center justify-center shadow-2xl shadow-[var(--accent)]/10">
          <span className="text-4xl font-bold text-[var(--accent)]">K</span>
        </div>
      </div>

      {/* Text */}
      <div
        className={`mt-6 text-center transition-all duration-500 delay-200 ${
          phase === "text" || phase === "fade"
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-2"
        }`}
      >
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Kiro Remote
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1 tracking-wide">
          Control your IDE from anywhere
        </p>
      </div>
    </div>
  );
}
