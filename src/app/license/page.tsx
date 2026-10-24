import type { Metadata } from "next";
import PolicyPage from "../policy-page";

export const metadata: Metadata = {
  title: "License | ExamMate",
  description: "License terms for ExamMate's original project materials.",
};

export default function LicensePage() {
  return (
    <PolicyPage title="ExamMate License">
      <p className="text-slate-200 text-sm leading-relaxed">
        <strong>Copyright © 2026 Ahnaf Shahriar Abir. All rights reserved.</strong>
        {" "}This license covers only original ExamMate materials owned by the
        rights holder, including original application code, project
        documentation, and visual design.
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
            to their own rights and license terms. The README credit to Tanjim
            Abubokor acknowledges the original Python routine script shared as
            project inspiration; it does not claim ownership of that script or
            grant permission to reuse it.
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

        <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
          For written permission or licensing questions, email{" "}
          <a
            className="text-teal-300 underline underline-offset-4 hover:text-teal-100"
            href="mailto:exammate.support@gmail.com?subject=ExamMate%20License"
          >
            exammate.support@gmail.com
          </a>
          .
        </p>
      </div>
    </PolicyPage>
  );
}
