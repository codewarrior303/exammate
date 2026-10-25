"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

type NavigationRequest = CustomEvent<{ path?: string }>;
const HOME_RETURN_KEY = "exammate:route-loading-home";
const POLICY_PATHS = new Set(["/privacy", "/terms", "/license"]);

export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const targetPathRef = useRef<string | null>(null);
  const pathnameRef = useRef(pathname);
  const currentProgressRef = useRef(0);
  const animationFrameRef = useRef(0);
  const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const clearTimers = () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
    };

    const finishNavigation = () => {
      if (!targetPathRef.current) return;
      targetPathRef.current = null;
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      cancelAnimationFrame(animationFrameRef.current);
      currentProgressRef.current = 100;
      setProgress(100);
      timersRef.current.push(
        setTimeout(() => setFadingOut(true), 100),
        setTimeout(() => setVisible(false), 280),
      );
    };

    const onNavigationStart = (event: Event) => {
      const targetPath = (event as NavigationRequest).detail?.path;
      if (!targetPath) return;

      clearTimers();
      cancelAnimationFrame(animationFrameRef.current);
      targetPathRef.current = targetPath;
      currentProgressRef.current = 0;
      setVisible(true);
      setFadingOut(false);
      setProgress(0);

      if (targetPath === "/") {
        try {
          sessionStorage.setItem(HOME_RETURN_KEY, "1");
        } catch {
          // The route overlay still works when browser storage is unavailable.
        }
      }

      // Progress indicates activity; don't display a fake numeric plateau.
      progressIntervalRef.current = setInterval(() => {
        currentProgressRef.current = Math.min(90, currentProgressRef.current + 4);
        setProgress(currentProgressRef.current);
      }, 70);

      // A failed navigation must not leave the overlay covering the page.
      timersRef.current.push(
        setTimeout(() => {
          try {
            sessionStorage.removeItem(HOME_RETURN_KEY);
          } catch {
            // Ignore unavailable browser storage.
          }
          finishNavigation();
        }, 12_000),
      );

      if (pathnameRef.current === targetPath) {
        animationFrameRef.current = requestAnimationFrame(finishNavigation);
      }
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

    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    const readyFrame = requestAnimationFrame(() => {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      currentProgressRef.current = 100;
      setProgress(100);
      timersRef.current.push(
        setTimeout(() => setFadingOut(true), 100),
        setTimeout(() => {
          setVisible(false);
          targetPathRef.current = null;
        }, 280),
      );
    });

    return () => cancelAnimationFrame(readyFrame);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ExamMate page"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#070D12] text-white transition-opacity duration-200 ease-out ${
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
              className="h-full w-full origin-left rounded-full bg-gradient-to-r from-teal-400 to-[#5EEAD4] shadow-[0_0_10px_rgba(94,234,212,0.7)] transition-transform duration-150 ease-out"
              style={{ transform: `scaleX(${progress / 100})` }}
            />
          </div>
          <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
            <span>{progress === 100 ? "Ready" : "Loading page..."}</span>
            {progress === 100 ? (
              <span className="font-mono tabular-nums font-semibold text-teal-300">
                100%
              </span>
            ) : (
              <span className="font-mono text-teal-300 animate-pulse">···</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
