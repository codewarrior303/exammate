"use client";

export default function LicenseContactLink() {
  return (
    <a
      className="mt-2 inline-flex max-w-full break-all font-medium text-teal-300 underline decoration-teal-400/40 underline-offset-4 transition-colors hover:text-teal-100"
      href="https://mail.google.com/mail/?view=cm&fs=1&to=exammate.support%40gmail.com&su=ExamMate%20License"
      target="_blank"
      rel="noopener noreferrer"
      onClick={(event) => {
        const isTouchDevice =
          navigator.maxTouchPoints > 0 &&
          window.matchMedia("(pointer: coarse)").matches;
        if (!isTouchDevice) return;
        event.preventDefault();
        window.location.href =
          "mailto:exammate.support@gmail.com?subject=ExamMate%20License";
      }}
    >
      exammate.support@gmail.com
    </a>
  );
}
