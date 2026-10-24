"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type NetworkInformation = Navigator & {
  connection?: { effectiveType?: string; saveData?: boolean; downlink?: number };
};

export function RouteLoadingOverlay() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: number | undefined;
    const onNavigationStart = () => {
      const connection = (navigator as NetworkInformation).connection;
      const slowNetwork = Boolean(
        connection?.saveData ||
          connection?.effectiveType === "slow-2g" ||
          connection?.effectiveType === "2g" ||
          connection?.effectiveType === "3g" ||
          (typeof connection?.downlink === "number" && connection.downlink < 1.5),
      );

      timer = window.setTimeout(() => setVisible(true), slowNetwork ? 180 : 450);
    };

    window.addEventListener("exammate:navigate", onNavigationStart);
    return () => {
      window.removeEventListener("exammate:navigate", onNavigationStart);
      if (timer) window.clearTimeout(timer);
    };
  }, [pathname]);

  useEffect(() => {
    setVisible(false);
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading ExamMate"
      className="fixed inset-0 z-[99999] flex min-h-screen flex-col items-center justify-center overflow-hidden bg-[#070D12] text-white"
    >
      <div className="pointer-events-none absolute h-80 w-80 rounded-full bg-teal-400/[0.07] blur-[100px]" />
      <div className="relative z-10 flex flex-col items-center gap-5">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          <span className="absolute inset-0 animate-ping rounded-2xl border border-teal-300/20" />
          <img src="/icon.svg" alt="" width="36" height="36" className="h-9 w-9" />
        </div>
        <div className="text-center">
          <p className="font-tech text-lg font-bold tracking-wide">
            Exam<span className="text-neon-mint">Mate</span>
          </p>
          <p className="mt-2 text-sm text-slate-400">Loading your page…</p>
        </div>
        <div className="h-1 w-36 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-skeleton-wave rounded-full bg-teal-300/70" />
        </div>
      </div>
    </div>
  );
}
