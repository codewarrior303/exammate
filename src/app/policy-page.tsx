import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { RouteLoadingLink } from "./route-loading-link";

export default function PolicyPage({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen px-3 py-8 sm:px-6 sm:py-12">
      <article className="mx-auto w-full max-w-3xl rounded-2xl border border-teal-200/20 bg-[#0d1b22]/80 p-4 shadow-2xl backdrop-blur-xl sm:p-10">
        <RouteLoadingLink
          href="/"
          showLoading
          className="mb-6 inline-flex items-center gap-2 text-sm text-teal-200 transition-colors hover:text-teal-100 sm:mb-8"
        >
          <ArrowLeft size={16} aria-hidden="true" />
          Back to ExamMate
        </RouteLoadingLink>
        <h1 className="mb-6 border-b border-teal-500/20 pb-4 font-tech text-2xl font-bold text-white sm:text-3xl">
          {title}
        </h1>
        <div className="space-y-4 text-sm leading-relaxed text-[#cbd5e1] [overflow-wrap:anywhere]">
          {children}
        </div>
      </article>
    </main>
  );
}
