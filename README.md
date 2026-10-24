<p align="center">
  <img src="public/exammate-logo.svg" alt="ExamMate logo" width="64" height="64" />
</p>

<h1 align="center">ExamMate</h1>

<p align="center">
  Turn your university exam routine into a clear, personal timetable.
</p>

<p align="center">
  <a href="https://exammate.triizync.com/">Open ExamMate</a>
  · <a href="LICENSE">License</a>
  · <a href="https://exammate.triizync.com/terms">Terms</a>
</p>

<p align="center">
  Upload an Excel routine or import a Google Drive file, choose your courses, then export or sync your exam schedule.
</p>

<p align="center">
  With appreciation to
  <a href="https://github.com/tanjim750">Tanjim Abubokor</a>
  for sharing the original Python exam-routine script that inspired ExamMate’s early project structure.
</p>

---

## Features

- **Routine import:** Parse `.xlsx`, `.xls`, `.xlsm`, and `.csv` files in the browser, or import a Google Drive/Sheets link.
- **Course matching:** Match course codes without case sensitivity and select the sections you take.
- **Schedule persistence:** Keep a generated routine in the same browser for up to 15 days. Clear it earlier with **Clear My Data**.
- **Exports:** Download a PDF or PNG, or print a clean schedule.
- **Google Calendar:** Sync exams to your primary calendar with an email reminder one day before and popup reminders 12 hours and one hour before the exam, when those reminder times are still in the future at sync time.
- **Optional Google sign-in:** Sign in only when using Google Drive access or Calendar sync.

## Built with

- Next.js 15, React 19, TypeScript, Tailwind CSS, and DaisyUI
- Better Auth and MongoDB
- Google Drive API and Google Calendar API
- SheetJS, jsPDF, and HTML Canvas



## Data and privacy

- Uploaded spreadsheet files are parsed in browser memory; the original upload is not stored as a server-side routine file.
- Generated routines are saved in the browser's local storage for up to 15 days and can be removed with **Clear My Data**.
- Google Drive access is used to read the file the user requests. Calendar access is used to create and update the user's exam events.
- Google sign-in is optional for local spreadsheet parsing and schedule generation.

See the [Privacy Policy](https://exammate.triizync.com/privacy) and [Terms](https://exammate.triizync.com/terms) for more information.

## License

ExamMate's original project materials are proprietary and reserved by their respective rights holders. This repository does not grant permission to copy, modify, redistribute, or commercially use those materials. Third-party packages and the original routine script credited above remain subject to their own owners' rights and license terms.

Read the full [ExamMate License](LICENSE) or visit the [License page](https://exammate.triizync.com/license). For licensing questions, contact [exammate.support@gmail.com](mailto:exammate.support@gmail.com).
