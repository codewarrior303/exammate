"use client";

import type { ReactNode } from "react";

type SupportEmailLinkProps = {
  subject?: string;
  className?: string;
  children?: ReactNode;
};

export function SupportEmailLink({
  subject = "ExamMate Support",
  className,
  children = "exammate.support@gmail.com",
}: SupportEmailLinkProps) {
  const mailto = `mailto:exammate.support@gmail.com?subject=${encodeURIComponent(subject)}`;

  return (
    <a
      href={mailto}
      className={className}
      onClick={(event) => {
        const isTouchDevice =
          navigator.maxTouchPoints > 0 &&
          window.matchMedia("(pointer: coarse)").matches;
        if (isTouchDevice) return;

        event.preventDefault();
        window.open(
          `https://mail.google.com/mail/?view=cm&fs=1&to=exammate.support%40gmail.com&su=${encodeURIComponent(subject)}`,
          "_blank",
          "noopener,noreferrer",
        );
      }}
    >
      {children}
    </a>
  );
}
