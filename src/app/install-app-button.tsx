"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice?: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

export function InstallAppButton() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "firefox" | "other">("other");

  useEffect(() => {
    const userAgent = navigator.userAgent;
    const isIos = /iphone|ipad|ipod/i.test(userAgent);
    const isAndroid = /android/i.test(userAgent);
    const isFirefox = /firefox/i.test(userAgent);
    setPlatform(isIos ? "ios" : isAndroid ? "android" : isFirefox ? "firefox" : "other");

    const standaloneQuery = window.matchMedia("(display-mode: standalone)");
    const updateInstalled = () => {
      const isStandalone = standaloneQuery.matches ||
        ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
      setInstalled(isStandalone);
    };
    const onBeforeInstallPrompt = (event: Event) => {
      // Keep the browser's own install affordance available (for example,
      // Brave/Chrome's address-bar install icon) while also retaining the
      // event for the in-page Install button.
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setShowHelp(false);
    };

    updateInstalled();
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    standaloneQuery.addEventListener("change", updateInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
      standaloneQuery.removeEventListener("change", updateInstalled);
    };
  }, []);

  if (installed) return null;

  async function handleInstall() {
    if (!installPrompt) {
      setShowHelp(true);
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      const result = await prompt.userChoice;
      if (result?.outcome === "accepted") setInstalled(true);
      else setShowHelp(true);
    } catch {
      setShowHelp(true);
    }
  }

  const instructions = platform === "ios"
    ? "In Safari, tap Share, then choose Add to Home Screen."
    : platform === "android"
      ? "Open the browser menu and choose Install app or Add to Home screen."
      : platform === "firefox"
        ? "Firefox desktop does not install PWAs. Open ExamMate in Brave, Chrome, or Edge and use the browser menu to install it."
        : "Open your browser menu and choose Install ExamMate or Install page as app. In Brave, look under Save and Share.";

  return (
    <>
      <span className="group/install relative inline-flex">
        <button
          type="button"
          onClick={handleInstall}
          aria-label="Install ExamMate app"
          aria-describedby="install-app-tooltip"
          className="btn-neon-primary inline-flex shrink-0 items-center justify-center gap-2 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-200/80"
        >
          <Download aria-hidden="true" className="h-4 w-4 shrink-0" />
          <span>Install app</span>
        </button>
        <span
          id="install-app-tooltip"
          role="tooltip"
          className="pointer-events-none invisible absolute bottom-[calc(100%+0.65rem)] left-1/2 z-30 hidden w-max max-w-[min(19rem,calc(100vw-2rem))] -translate-x-1/2 translate-y-1 rounded-xl border border-teal-400/35 bg-[#0A1822]/95 px-3.5 py-2 text-xs font-medium text-teal-100 opacity-0 shadow-[0_12px_30px_rgba(0,0,0,0.55),0_0_15px_rgba(94,234,212,0.12)] backdrop-blur-xl transition-all duration-200 lg:block lg:group-hover/install:visible lg:group-hover/install:translate-y-0 lg:group-hover/install:opacity-100 lg:group-focus-within/install:visible lg:group-focus-within/install:translate-y-0 lg:group-focus-within/install:opacity-100"
        >
          <span className="flex items-center gap-1.5 whitespace-nowrap">
            <span
              aria-hidden="true"
              className="h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400 shadow-[0_0_6px_rgba(94,234,212,0.65)]"
            />
            <span>Install ExamMate on your device</span>
          </span>
          <span
            aria-hidden="true"
            className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-b border-r border-teal-400/35 bg-[#0A1822]"
          />
        </span>
      </span>

      {showHelp && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/65 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowHelp(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-app-title"
            className="w-full max-w-sm rounded-2xl border border-teal-400/25 bg-[#0d1b22] p-5 shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="install-app-title" className="text-base font-semibold text-white">Install ExamMate</h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{instructions}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                aria-label="Close install instructions"
                className="rounded-lg p-1 text-slate-400 transition-colors hover:bg-white/5 hover:text-white"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-3 text-xs text-slate-500">ExamMate stays available as a website if you prefer not to install it.</p>
          </section>
        </div>
      )}
    </>
  );
}
