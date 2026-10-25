"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const HOME_READY_EVENT = "exammate:home-ready";

export function WebsiteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);
  const progressRef = useRef(0);
  const readyRef = useRef(false);
  const documentLoadedRef = useRef(false);

  useLayoutEffect(() => {
    if (pathname !== "/") {
      setVisible(false);
      return;
    }

    const navigationEntry = performance.getEntriesByType("navigation")[0] as
      | PerformanceNavigationTiming
      | undefined;
    if (navigationEntry?.type !== "reload") {
      setVisible(false);
      return;
    }

    setVisible(true);
    progressRef.current = 0;
    readyRef.current = false;
    documentLoadedRef.current = document.readyState === "complete";
    setProgress(0);
    setFadingOut(false);
    const onHomeReady = () => {
      readyRef.current = true;
    };
    const onDocumentLoad = () => {
      documentLoadedRef.current = true;
    };

    let progressTimer: ReturnType<typeof setInterval> | undefined;
    progressTimer = setInterval(() => {
      if (progressRef.current < 95) {
        progressRef.current = Math.min(95, progressRef.current + 5);
        setProgress(progressRef.current);
        return;
      }

      if (readyRef.current && documentLoadedRef.current) {
        if (progressTimer) clearInterval(progressTimer);
        progressRef.current = 100;
        setProgress(100);
        setFadingOut(true);
        document.documentElement.removeAttribute("data-exammate-refresh");
        finishTimer = setTimeout(() => setVisible(false), 200);
      }
    }, 24);
    let finishTimer: ReturnType<typeof setTimeout> | undefined;

    window.addEventListener(HOME_READY_EVENT, onHomeReady, { once: true });
    if (!documentLoadedRef.current) {
      window.addEventListener("load", onDocumentLoad, { once: true });
    }

    // The marker covers the case where Home hydrates before this effect listens.
    if (document.documentElement.dataset.examMateHomeReady === "true") onHomeReady();

    // Never trap the user behind a loader if a client script fails to hydrate.
    const safetyTimer = setTimeout(() => {
      readyRef.current = true;
      documentLoadedRef.current = true;
    }, 8_000);

    return () => {
      window.removeEventListener(HOME_READY_EVENT, onHomeReady);
      window.removeEventListener("load", onDocumentLoad);
      clearTimeout(finishTimer);
      clearTimeout(safetyTimer);
      if (progressTimer) clearInterval(progressTimer);
    };
  }, [pathname]);

  if (pathname !== "/") return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ExamMate"
      className={`refresh-loader fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#070D12] text-white transition-opacity duration-200 ease-out ${
        visible && !fadingOut
          ? "is-visible opacity-100"
          : "pointer-events-none opacity-0"
      }`}
    >
      <div className="pointer-events-none absolute h-[380px] w-[380px] -translate-y-6 rounded-full bg-teal-500/[0.08] blur-[100px]" />
      <div className="relative z-10 flex max-w-sm flex-col items-center px-4 text-center">
        <img
          src="/icon.svg?v=2"
          alt="ExamMate logo"
          width="64"
          height="64"
          draggable={false}
          className="relative z-10 mb-5 h-14 w-14 select-none drop-shadow-[0_0_12px_rgba(94,234,212,0.35)] sm:h-16 sm:w-16"
        />
        <h1 className="font-sans text-2xl font-bold tracking-tight text-white">
          Exam<span className="text-[#5EEAD4]">Mate</span>
        </h1>
        <div className="mt-7 w-56 sm:w-64">
          <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-teal-400 to-[#5EEAD4] shadow-[0_0_10px_rgba(94,234,212,0.7)] transition-transform duration-75 ease-linear"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{progress === 100 ? "Ready" : "Loading your workspace..."}</span>
            <span className="font-mono tabular-nums font-semibold text-teal-300">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
