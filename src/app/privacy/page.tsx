import type { Metadata } from "next";
import PolicyPage from "../policy-page";

export const metadata: Metadata = {
  title: "Privacy Policy | ExamMate",
  description:
    "Learn what ExamMate processes when you upload a routine, import a shared Drive link, or optionally sync exams with Google Calendar.",
};

export default function PrivacyPage() {
  return (
    <PolicyPage title="Privacy Policy">
      <p>
        <strong>Last updated: October 25, 2026.</strong> This policy explains
        how ExamMate, operated by the ExamMate project, accesses, uses, stores,
        and shares information when you use exammate.triizync.com. ExamMate
        helps students extract exam dates from a routine and optionally add
        selected exams to Google Calendar.
      </p>

      <div className="space-y-6 pt-2">
        <section className="rounded-xl border border-teal-500/15 bg-teal-950/20 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            Information we process
          </h2>
          <ul className="list-disc space-y-2 pl-5 text-xs leading-relaxed text-slate-300 sm:text-sm">
            <li>
              <strong>Files uploaded from your device:</strong> spreadsheet
              formats supported by the uploader are parsed in your browser.
              The original upload is not sent to ExamMate&apos;s server.
            </li>
            <li>
              <strong>Shared Google Drive or Sheets links:</strong> when you
              submit a link, our server fetches the publicly accessible,
              link-shared file and temporarily handles its contents in memory
              to return it to your browser for parsing. Private links are not
              opened using your Google account. We do not intentionally save
              the file or submitted link in our application database. Anyone
              with the link must be able to view the file; otherwise, upload
              the spreadsheet from your device.
            </li>
            <li>
              <strong>Routine and course selections:</strong> the schedule you
              generate is stored in this browser&apos;s local storage for up to
              15 days so it can survive a refresh. Use <strong>Clear My Data</strong>
              to remove it sooner. The local routine is not an account backup.
            </li>
            <li>
              <strong>Google account and sign-in data:</strong> if you connect
              Google, ExamMate receives basic account identity details such as
              your name, email address, and Google account identifier to
              authenticate you and associate the connection with your account.
              ExamMate does not receive your Google password.
            </li>
          </ul>
        </section>

        <section className="rounded-xl border border-teal-500/15 bg-teal-950/20 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            Optional Google Calendar access
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            Calendar sync is optional and begins only when you choose to
            connect/sync. For this feature, ExamMate requests the Google
            identity scopes <code>openid</code>, <code>email</code>, and{" "}
            <code>profile</code>, plus{" "}
            <code>https://www.googleapis.com/auth/calendar.events.owned</code>.
            Google defines that Calendar scope as permission to view, create,
            change, and delete events on calendars you own. ExamMate uses it to
            create and update only the ExamMate exam events it generates in
            your primary calendar; the application code does not list or read
            your existing events and does not delete calendar events.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
            If Calendar is already connected and authorized, generating a
            routine can automatically sync its matched exams; otherwise,
            ExamMate asks you before requesting Calendar access and syncing.
            When a sync occurs, the selected course title and code, faculty if
            present, exam date and time, reminder settings, and the reminder
            description are sent to Google Calendar and stored there as event
            details. Google Calendar handles any reminder notifications or
            reminder emails according to your Google settings. Events already
            created remain in your Google Calendar if you disconnect ExamMate;
            remove those events in Google Calendar if you no longer want them.
          </p>
        </section>

        <section className="rounded-xl border border-teal-500/15 bg-teal-950/20 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            Storage, security, and retention
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            Google account, session, and linked-account records are stored on
            ExamMate&apos;s server-side MongoDB database. OAuth access and
            refresh tokens are encrypted by the authentication service before
            storage; they are not saved in browser local storage. Tokens are
            retained while the Google account remains connected so Calendar
            sync can work. Disconnecting removes the linked account from
            ExamMate and attempts to revoke its Google authorization; the
            ExamMate account record may remain until you request its deletion.
            You may also revoke access in your Google Account security
            settings.
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-300 sm:text-sm">
            We use reasonable technical and organizational safeguards, but no
            internet service can guarantee absolute security. To request
            deletion of server-side account data, contact{" "}
            <a
              className="text-teal-300 underline underline-offset-4"
              href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=exammate.support%40gmail.com"
            >
              exammate.support@gmail.com
            </a>
            . Clearing local routine data and disconnecting Google are separate
            actions.
          </p>
        </section>

        <section className="rounded-xl border border-teal-500/15 bg-teal-950/20 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            Service providers and analytics
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            ExamMate uses Google for sign-in and Calendar, MongoDB for
            server-side authentication records, and Vercel to host the website.
            Vercel Analytics and Speed Insights are enabled to measure site
            usage and performance, such as page activity, browser/device
            categories, and web performance metrics. These services may process
            technical request and measurement data to operate their features.
            We do not sell Google user data, use it for advertising, or use it
            to train generalized AI/ML models. Google user data is used only to
            provide the user-facing features described above and in accordance
            with the Google API Services User Data Policy.
          </p>
        </section>

        <section className="rounded-xl border border-teal-500/15 bg-teal-950/20 p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-white">
            <span className="h-2 w-2 rounded-full bg-teal-400" />
            Your choices and policy updates
          </h2>
          <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
            You can use routine upload, parsing, and exports without Google
            sign-in. You can decline Calendar sync, clear the locally stored
            routine, disconnect Google, or revoke access from your Google
            Account. If ExamMate changes how it accesses or uses Google user
            data, this policy will be updated before the changed use begins and
            any required Google authorization will be requested. Questions or
            deletion requests: {" "}
            <a
              className="text-teal-300 underline underline-offset-4"
              href="https://mail.google.com/mail/?view=cm&amp;fs=1&amp;to=exammate.support%40gmail.com"
            >
              exammate.support@gmail.com
            </a>
            .
          </p>
        </section>

        <section className="overflow-hidden rounded-2xl border border-teal-400/25 bg-gradient-to-br from-teal-500/[0.10] via-[#10232B]/90 to-emerald-500/[0.07] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.22)] sm:p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-teal-300/25 bg-teal-400/10 text-teal-200">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-5 w-5"
              >
                <path
                  d="M12 3 19 6v5c0 4.7-2.9 8-7 10-4.1-2-7-5.3-7-10V6l7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-white sm:text-lg">
                No ads. No AI training.
              </h2>
              <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                ExamMate does not sell your personal data, run third-party
                advertising trackers, build cross-site advertising profiles,
                or use Google user data to train AI models. Vercel Analytics
                and Speed Insights still process the site-usage and performance
                measurements described above; ExamMate does not use those
                measurements for advertising.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-teal-300/20 bg-teal-300/[0.08] px-2.5 py-1 text-[10px] font-medium tracking-wide text-teal-100 sm:text-[11px]">
                  NO THIRD-PARTY ADS
                </span>
                <span className="rounded-full border border-teal-300/20 bg-teal-300/[0.08] px-2.5 py-1 text-[10px] font-medium tracking-wide text-teal-100 sm:text-[11px]">
                  NO GOOGLE DATA AI TRAINING
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </PolicyPage>
  );
}
