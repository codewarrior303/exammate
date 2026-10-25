"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export function WebsiteLoader() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(true);
  const [fadingOut, setFadingOut] = useState(false);
  const progressBarRef = useRef<HTMLDivElement | null>(null);
  const progressTextRef = useRef<HTMLSpanElement | null>(null);
  const progressStatusRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (pathname !== "/") {
      setMounted(false);
      return;
    }

    // A policy-page return uses RouteLoadingOverlay; avoid stacking the
    // homepage's initial-load overlay on top of that route transition.
    try {
      if (sessionStorage.getItem("exammate:route-loading-home") === "1") {
        sessionStorage.removeItem("exammate:route-loading-home");
        setMounted(false);
        return;
      }
    } catch {
      // Continue with the normal homepage loader if storage is unavailable.
    }

    setMounted(true);
    setFadingOut(false);
    const progressBar = progressBarRef.current;
    const progressText = progressTextRef.current;
    const progressStatus = progressStatusRef.current;
    if (!progressBar || !progressText || !progressStatus) return;

    let animationFrameId = 0;
    let fadeTimeout: ReturnType<typeof setTimeout> | undefined;
    let unmountTimeout: ReturnType<typeof setTimeout> | undefined;
    const startedAt = performance.now();
    const duration = 420;
    progressBar.style.transform = "scaleX(0)";
    const barAnimation = progressBar.animate(
      [{ transform: "scaleX(0)" }, { transform: "scaleX(1)" }],
      { duration, easing: "linear", fill: "forwards" },
    );
    progressText.textContent = "0%";
    progressStatus.textContent = "Loading workspace...";

    const animate = (now: number) => {
      // Keep the visual work outside React's render cycle. The bar and its
      // percentage follow the same deterministic timeline, independent of network.
      const progress = Math.min(1, (now - startedAt) / duration);
      const percentage = Math.floor(progress * 100);
      progressText.textContent = `${percentage}%`;

      if (progress >= 1) {
        progressBar.style.transform = "scaleX(1)";
        barAnimation.cancel();
        progressText.textContent = "100%";
        progressStatus.textContent = "Ready";
        fadeTimeout = setTimeout(() => {
          setFadingOut(true);
          unmountTimeout = setTimeout(() => setMounted(false), 260);
        }, 100);
        return;
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
      barAnimation.cancel();
      if (fadeTimeout) clearTimeout(fadeTimeout);
      if (unmountTimeout) clearTimeout(unmountTimeout);
    };
  }, [pathname]);

  if (pathname !== "/" || !mounted) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ExamMate"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-[#070D12] text-white select-none overflow-hidden transition-all duration-250 ease-out ${
        fadingOut
          ? "opacity-0 scale-[1.02] pointer-events-none"
          : "opacity-100 scale-100 pointer-events-auto"
      }`}
    >
      {/* Subtle modern radial ambient light */}
      <div className="pointer-events-none absolute h-[380px] w-[380px] -translate-y-6 rounded-full bg-teal-500/[0.08] blur-[100px]" />

      <div className="relative z-10 flex flex-col items-center text-center px-4 max-w-sm">
        {/* Standalone transparent mark, without a glass badge behind it. */}
        <img
          src="/icon.svg?v=2"
          alt="ExamMate Logo"
          width="64"
          height="64"
          draggable={false}
          className="relative z-10 mb-5 h-14 w-14 select-none drop-shadow-[0_0_12px_rgba(94,234,212,0.35)] sm:h-16 sm:w-16"
        />

        {/* Clean, Modern Brand Title */}
        <h1 className="text-2xl font-bold tracking-tight text-white font-sans">
          Exam<span className="text-[#5EEAD4]">Mate</span>
        </h1>

        {/* Minimal progress indicator, animated independently of React renders. */}
        <div className="mt-7 w-56 sm:w-64">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              ref={progressBarRef}
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-teal-400 to-[#5EEAD4] shadow-[0_0_10px_rgba(94,234,212,0.7)]"
              style={{ transform: "scaleX(0)" }}
            />
          </div>

          {/* Understated Status & Percentage */}
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span ref={progressStatusRef} className="font-normal text-slate-400 text-[11px] sm:text-xs">
              Loading workspace...
            </span>
            <span ref={progressTextRef} className="font-mono tabular-nums text-[11px] sm:text-xs font-semibold text-teal-300">
              0%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
