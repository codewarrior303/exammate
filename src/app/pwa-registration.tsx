"use client";

import { useEffect } from "react";

export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let registration: ServiceWorkerRegistration | undefined;
    let disposed = false;
    const updateWorker = () => {
      if (navigator.onLine && registration) {
        void registration.update().catch(() => {});
      }
    };

    void navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((value) => {
        if (disposed) return;
        registration = value;
        updateWorker();
      })
      .catch(() => {
        // The website remains fully usable if service worker registration is unavailable.
      });
    window.addEventListener("online", updateWorker);

    return () => {
      disposed = true;
      window.removeEventListener("online", updateWorker);
    };
  }, []);

  return null;
}
