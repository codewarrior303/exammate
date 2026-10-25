"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const HOME_RETURN_KEY = "exammate:route-loading-home";
const HOME_READY_EVENT = "exammate:home-ready";

export function WebsiteLoader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [ready, setReady] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    if (pathname !== "/") {
      setVisible(false);
      return;
    }

    try {
      if (sessionStorage.getItem(HOME_RETURN_KEY) === "1") {
        sessionStorage.removeItem(HOME_RETURN_KEY);
        setVisible(false);
        return;
      }
    } catch {
      // The first-load screen still works when session storage is unavailable.
    }

    setVisible(true);
    setReady(false);
    setFadingOut(false);
    const startedAt = performance.now();
    let finishTimer: ReturnType<typeof setTimeout> | undefined;
    let fadeTimer: ReturnType<typeof setTimeout> | undefined;
    let hideTimer: ReturnType<typeof setTimeout> | undefined;
    let finished = false;

    const finish = () => {
      if (finished) return;
      finished = true;
      const remaining = Math.max(0, 180 - (performance.now() - startedAt));
      finishTimer = setTimeout(() => {
        setReady(true);
        fadeTimer = setTimeout(() => setFadingOut(true), 70);
        hideTimer = setTimeout(() => setVisible(false), 250);
      }, remaining);
    };

    const onHomeReady = () => finish();
    window.addEventListener(HOME_READY_EVENT, onHomeReady, { once: true });

    // The marker covers the case where Home hydrates before this effect listens.
    if (document.documentElement.dataset.examMateHomeReady === "true") finish();

    // Never trap the user behind a loader if a client script fails to hydrate.
    const safetyTimer = setTimeout(finish, 8_000);

    return () => {
      window.removeEventListener(HOME_READY_EVENT, onHomeReady);
      clearTimeout(finishTimer);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
      clearTimeout(safetyTimer);
    };
  }, [pathname]);

  if (pathname !== "/" || !visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ExamMate"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center overflow-hidden bg-[#070D12] text-white transition-opacity duration-200 ease-out ${
        fadingOut ? "pointer-events-none opacity-0" : "opacity-100"
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
            {ready ? (
              <div className="h-full w-full origin-left rounded-full bg-gradient-to-r from-teal-400 to-[#5EEAD4] shadow-[0_0_10px_rgba(94,234,212,0.7)] transition-transform duration-150 ease-out" />
            ) : (
              <div className="loader-sweep h-full w-2/5 rounded-full bg-gradient-to-r from-teal-400 to-[#5EEAD4] shadow-[0_0_10px_rgba(94,234,212,0.7)]" />
            )}
          </div>
          <div className="mt-3 text-left text-xs text-slate-400">
            {ready ? "Ready" : "Loading your workspace..."}
          </div>
        </div>
      </div>
    </div>
  );
}
