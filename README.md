<p align="center">
  <img src="src/app/icon.svg" alt="ExamMate logo" width="64" height="64" />
</p>

<h1 align="center">ExamMate</h1>

<p align="center">
  Turn your university exam routine into a clear, personalized schedule.
</p>

<p align="center">
  <a href="https://exammate.triizync.com/">ExamMate</a>
  · <a href="LICENSE">License</a>
</p>

<p align="center">
  Upload an Excel routine or import a Google Drive file, choose your courses, then export or sync your exam schedule.
</p>

<p align="center">
  With special appreciation to our respected senior
  <a href="https://github.com/tanjim750">Tanjim Abubokor</a>
  for sharing the original Python exam-routine script that inspired ExamMate’s early project structure.
</p>

---

## Features

- **Routine import:** Parse `.xlsx`, `.xls`, `.xlsm`, and `.csv` files in the browser, or import a Google Drive/Sheets link.
- **Course matching:** Match course codes without case sensitivity and select the sections you take.
- **Schedule persistence:** Keep a generated routine in the same browser for up to 15 days. Clear it earlier with **Clear My Data**.
- **Exports:** Download a PDF or PNG, or print a clean schedule.
- **Google Drive link import:** Use a file shared as **Anyone with the link can view**, or upload a spreadsheet from your device. Importing a link does not request Google Drive OAuth access. The server temporarily fetches the linked file and returns it to your browser for parsing; private links require you to change sharing or upload the file.
- **Optional Google Calendar sync:** Calendar sync is optional. You can use ExamMate without adding events to Google Calendar. After you connect and grant Calendar permission, matched exams can sync automatically when you generate a routine. Events use reminders for email one day before and pop-ups 12 hours and one hour before, when those times are still in the future at sync time.
- **Optional Google sign-in:** You do not need an account for local spreadsheet upload, public/link-shared Drive import, or routine generation. Google sign-in is only used when you choose Calendar sync.

## Built with

- Next.js, React, TypeScript, Tailwind CSS, and DaisyUI
- Better Auth and MongoDB
- Google Calendar API and public Google Drive/Sheets sharing links
- SheetJS, jsPDF, and HTML Canvas



## Data and privacy

- Uploaded spreadsheet files are parsed in browser memory; the original upload is not stored as a server-side routine file.
- Generated routines are saved in the browser's local storage for up to 15 days and can be removed with **Clear My Data**.
- A shared Drive link is fetched temporarily by the server, then parsed in the browser. Excel uploads are parsed in the browser and are not uploaded to ExamMate's server.
- Google Calendar sync is optional. On an explicit sync action, ExamMate requests `openid`, `email`, `profile`, and `calendar.events.owned`. Google grants this Calendar scope the ability to view, create, change, and delete events on calendars the user owns. ExamMate's code uses it to create or update only the ExamMate exam events in the primary calendar; it does not list existing events or delete calendar events. Synced exam details are sent to Google and events remain there after disconnect.
- Google OAuth account/session records are stored server-side in MongoDB; Better Auth encrypts OAuth tokens at rest. Generated exam routines remain in browser local storage for up to 15 days.
- Vercel Analytics and Speed Insights are enabled for site usage/performance measurements.
- Google sign-in is optional for local spreadsheet parsing and schedule generation.

See the [Privacy Policy](https://exammate.triizync.com/privacy) and [Terms](https://exammate.triizync.com/terms) for more information. The policy is also linked from the application homepage and describes the Google data accessed, purpose, storage, and sharing.

## License

ExamMate's original project materials are proprietary and reserved by their respective rights holders. This repository does not grant permission to copy, modify, redistribute, or commercially use those materials. Third-party packages and the original routine script credited above remain subject to their own owners' rights and license terms.

Read the full [ExamMate License](LICENSE). For licensing questions, contact us at <a href="https://exammate.triizync.com/contact-email?subject=ExamMate%20License">exammate.support@gmail.com</a>.
