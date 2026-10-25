"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

export function RouteLoadingLink({
  href,
  className,
  children,
  showLoading = false,
  ariaLabel,
}: {
  href: string;
  className?: string;
  children: ReactNode;
  showLoading?: boolean;
  ariaLabel?: string;
}) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    if (!navigator.onLine) {
      event.preventDefault();
      window.location.assign(href);
      return;
    }

    if (showLoading) {
      window.dispatchEvent(
        new CustomEvent("exammate:navigate", { detail: { path: href } }),
      );
    }
  }

  return (
    <Link href={href} className={className} onClick={handleClick} aria-label={ariaLabel}>
      {children}
    </Link>
  );
}
