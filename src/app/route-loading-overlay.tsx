"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type NavigationRequest = CustomEvent<{ path?: string }>;
const POLICY_PATHS = new Set(["/privacy", "/terms", "/license"]);

export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const targetPathRef = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  const routeReadyRef = useRef(false);
  const currentProgressRef = useRef(0);
  const startedAtRef = useRef(0);
  const animationFrameRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };

    const onNavigationStart = (event: Event) => {
      const targetPath = (event as NavigationRequest).detail?.path;
      if (!targetPath) return;

      clearTimers();
      cancelAnimationFrame(animationFrameRef.current);
      targetPathRef.current = targetPath;
      routeReadyRef.current = false;
      currentProgressRef.current = 0;
      startedAtRef.current = performance.now();
      setVisible(true);
      setFadingOut(false);
      setProgress(0);

      const animate = () => {
        const targetProgress = routeReadyRef.current ? 100 : 90;
        const step = routeReadyRef.current
          ? Math.max(2, (targetProgress - currentProgressRef.current) * 0.24)
          : Math.max(0.8, (targetProgress - currentProgressRef.current) * 0.2);
        currentProgressRef.current = Math.min(
          targetProgress,
          currentProgressRef.current + step,
        );
        const nextProgress = Math.floor(currentProgressRef.current);
        setProgress((previous) => (previous === nextProgress ? previous : nextProgress));

        if (routeReadyRef.current && currentProgressRef.current >= 99.5) {
          setProgress(100);
          const fadeTimer = setTimeout(() => setFadingOut(true), 100);
          const hideTimer = setTimeout(() => setVisible(false), 360);
          timersRef.current.push(fadeTimer, hideTimer);
          return;
        }
        animationFrameRef.current = requestAnimationFrame(animate);
      };
      animationFrameRef.current = requestAnimationFrame(animate);

      // If navigation fails, release the screen instead of trapping the user.
      timersRef.current.push(
        setTimeout(() => {
          targetPathRef.current = null;
          cancelAnimationFrame(animationFrameRef.current);
          routeReadyRef.current = true;
          setProgress(100);
          timersRef.current.push(
            setTimeout(() => setFadingOut(true), 100),
            setTimeout(() => setVisible(false), 360),
          );
        }, 12_000),
      );
    };

    const onPopState = () => {
      if (POLICY_PATHS.has(pathnameRef.current) && window.location.pathname === "/") {
        window.dispatchEvent(
          new CustomEvent("exammate:navigate", { detail: { path: "/" } }),
        );
      }
    };

    window.addEventListener("exammate:navigate", onNavigationStart);
    window.addEventListener("popstate", onPopState);
    return () => {
      window.removeEventListener("exammate:navigate", onNavigationStart);
      window.removeEventListener("popstate", onPopState);
      cancelAnimationFrame(animationFrameRef.current);
      clearTimers();
    };
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (targetPathRef.current !== pathname) return;

    targetPathRef.current = null;
    const remainingMinimumTime = Math.max(
      0,
      180 - (performance.now() - startedAtRef.current),
    );
    const readyTimer = setTimeout(() => {
      routeReadyRef.current = true;
    }, remainingMinimumTime);
    timersRef.current.push(readyTimer);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ExamMate page"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#070D12] text-white transition-opacity duration-250 ${
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
    >
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-teal-400/[0.07] blur-[100px]" />
      <div className="relative z-10 flex w-56 flex-col items-center text-center sm:w-64">
        <img
          src="/icon.svg?v=2"
          alt=""
          width="56"
          height="56"
          draggable={false}
          className="mb-5 h-14 w-14 select-none drop-shadow-[0_0_12px_rgba(94,234,212,0.35)]"
        />
        <p className="font-tech text-lg font-bold tracking-wide">
          Exam<span className="text-neon-mint">Mate</span>
        </p>
        <div className="mt-7 w-full">
          <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-teal-400 to-[#5EEAD4] shadow-[0_0_10px_rgba(94,234,212,0.7)]"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{progress === 100 ? "Ready" : "Loading page..."}</span>
            <span className="font-mono tabular-nums font-semibold text-teal-300">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
