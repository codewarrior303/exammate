"use client";

import { useEffect } from "react";

const SUPPORT_EMAIL = "exammate.support@gmail.com";

export default function ContactEmailPage() {
  useEffect(() => {
    const subject = new URLSearchParams(window.location.search).get("subject");
    const safeSubject = subject === "ExamMate License" ? subject : "ExamMate Support";
    const encodedSubject = encodeURIComponent(safeSubject);
    const isTouchDevice =
      navigator.maxTouchPoints > 0 &&
      window.matchMedia("(pointer: coarse)").matches;

    if (isTouchDevice) {
      window.location.replace(
        `mailto:${SUPPORT_EMAIL}?subject=${encodedSubject}`,
      );
      return;
    }

    window.location.replace(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(SUPPORT_EMAIL)}&su=${encodedSubject}`,
    );
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0A1118] px-5 text-center text-slate-300">
      <div role="status" aria-live="polite">
        <p className="font-tech text-lg font-semibold text-white">ExamMate</p>
        <p className="mt-2 text-sm">Opening your email app…</p>
        <p className="mt-1 text-xs text-slate-500">{SUPPORT_EMAIL}</p>
      </div>
    </main>
  );
}
