<p align="center">
  <img src="public/exammate-logo.svg" alt="ExamMate logo" width="64" height="64" />
</p>

<h1 align="center">ExamMate</h1>

<p align="center">
  Turn your university exam routine into a clear, personal timetable.
</p>

<p align="center">
  <a href="https://exammate.triizync.com/">ExamMate</a>
  · <a href="LICENSE">License</a>
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
- **Google Drive import:** A Drive/Sheets link requires Google sign-in and read-only Drive access so ExamMate can fetch the routine file you linked. It does not need permission to edit or delete Drive files. Uploading an Excel file from your device does not require Drive access.
- **Optional Google Calendar sync:** Calendar sync is an optional feature. You can generate and use your routine without adding events to Google Calendar. If you choose to sync, ExamMate adds your selected exam events to your primary calendar with reminders: email one day before and pop-ups 12 hours and one hour before, when those reminder times are still in the future at sync time.
- **Optional Google sign-in:** You do not need an account for local spreadsheet upload or routine generation. Google sign-in is needed only for Google Drive import or if you choose Google Calendar features.

## Built with

- Next.js, React, TypeScript, Tailwind CSS, and DaisyUI
- Better Auth and MongoDB
- Google Drive API and Google Calendar API
- SheetJS, jsPDF, and HTML Canvas



## Data and privacy

- Uploaded spreadsheet files are parsed in browser memory; the original upload is not stored as a server-side routine file.
- Generated routines are saved in the browser's local storage for up to 15 days and can be removed with **Clear My Data**.
- For a Drive link, ExamMate requests read-only Drive access to retrieve the specific routine file identified by the link; it does not need Drive edit or delete access. Local spreadsheet uploads are parsed in the browser and do not use Google Drive.
- Google Calendar sync is optional. Calendar access is used only for the calendar feature, to create or update ExamMate exam events in the user's primary calendar.
- Google sign-in is optional for local spreadsheet parsing and schedule generation.

See the [Privacy Policy](https://exammate.triizync.com/privacy) and [Terms](https://exammate.triizync.com/terms) for more information.

## License

ExamMate's original project materials are proprietary and reserved by their respective rights holders. This repository does not grant permission to copy, modify, redistribute, or commercially use those materials. Third-party packages and the original routine script credited above remain subject to their own owners' rights and license terms.

Read the full [ExamMate License](LICENSE). For licensing questions, contact [exammate.support@gmail.com](mailto:exammate.support@gmail.com).
