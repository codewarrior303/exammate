"use client";

export default function LicenseContactLink() {
  return (
    <button
      type="button"
      className="mt-2 inline-flex max-w-full break-all border-0 bg-transparent p-0 text-left font-medium text-teal-300 underline decoration-teal-400/40 underline-offset-4 transition-colors hover:text-teal-100"
      onClick={() => {
        const isTouchDevice =
          navigator.maxTouchPoints > 0 &&
          window.matchMedia("(pointer: coarse)").matches;
        if (isTouchDevice) {
          window.location.href =
            "mailto:exammate.support@gmail.com?subject=ExamMate%20License";
        } else {
          window.open(
            "https://mail.google.com/mail/?view=cm&fs=1&to=exammate.support%40gmail.com&su=ExamMate%20License",
            "_blank",
            "noopener,noreferrer",
          );
        }
      }}
    >
      exammate.support@gmail.com
    </button>
  );
}
