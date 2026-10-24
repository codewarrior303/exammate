import type { Metadata } from "next";
import { Mail } from "lucide-react";
import PolicyPage from "../policy-page";
import LicenseContactLink from "./license-contact-link";

export const metadata: Metadata = {
  title: "License | ExamMate",
  description: "License terms for ExamMate's original project materials.",
};

export default function LicensePage() {
  return (
    <PolicyPage title="ExamMate License">
      <p className="text-slate-200 text-sm leading-relaxed">
        <strong>
          Copyright © 2026 Ahnaf Shahriar Abir. All rights reserved.
        </strong>{" "}
        This license covers only original ExamMate materials owned by the rights
        holder, including original application code, project documentation, and
        visual design.
      </p>

      <div className="space-y-6 pt-2">
        <section className="rounded-xl border border-teal-500/15 bg-teal-950/20 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            Permission and restrictions
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            No permission is granted to copy, modify, publish, distribute,
            sublicense, sell, or create derivative works from covered ExamMate
            materials without prior written permission from the relevant rights
            holder.
          </p>
        </section>

        <section className="rounded-xl border border-teal-500/15 bg-teal-950/20 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            Third-party work and attribution
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            Third-party dependencies, assets, and contributions remain subject
            to their own rights and license terms. With deep respect and sincere
            appreciation, we extend our heartfelt recognition to our esteemed
            senior{" "}
            <strong>
              <a
                href="https://github.com/tanjim750"
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer text-teal-300 underline decoration-teal-400/35 underline-offset-2 transition-colors hover:text-teal-100 hover:decoration-teal-200 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
                aria-label="Visit Tanjim Abubokor’s GitHub profile"
              >
                Tanjim Abubokor
              </a>
            </strong>{" "}
            for sharing the foundational Python routine script that gracefully
            inspired ExamMate's early project structure. This acknowledgment
            purely celebrates his inspiring contribution as a gesture of
            professional courtesy and respect; it does not imply ownership,
            co-authorship, or permission to reuse the original work, with all
            rights remaining fully with him.
          </p>
        </section>

        <section className="rounded-xl border border-teal-500/15 bg-teal-950/20 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            Application use
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            Use of the hosted ExamMate service is subject to its Terms and
            Conditions. The application is provided “as is”, without warranties
            to the extent permitted by applicable law.
          </p>
        </section>

        <section className="mt-2 flex gap-4 rounded-2xl border border-teal-400/25 bg-gradient-to-br from-teal-400/[0.09] via-[#0d1b22]/80 to-cyan-400/[0.04] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.2)] sm:p-5">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-teal-400/25 bg-teal-400/10 text-teal-300">
            <Mail size={18} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="font-semibold text-white">
              Questions about this license?
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
              For written permission or licensing questions, contact us at
            </p>
            <LicenseContactLink />
          </div>
        </section>
      </div>
    </PolicyPage>
  );
}
