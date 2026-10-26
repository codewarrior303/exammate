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
- **Google Drive link import:** Public links work without sign-in. For a private file, connect the Google account that can access it and grant optional, read-only Drive access. ExamMate uses Drive API access for only the file ID in the link you submitted; it does not search/list, edit, delete, or share Drive files. The server handles the file temporarily and returns it to your browser for parsing.
- **Safer routine imports:** Excel/CSV uploads are parsed on-device as data; workbook macros and scripts are not run. Drive import accepts HTTPS links from Google Drive/Sheets hosts only and follows redirects only to approved Google hosts. Use files and links from sources you trust, and never paste a Google password or sign-in link into ExamMate.
- **Optional Google Calendar sync:** Calendar sync is optional. You can use ExamMate without adding events to Google Calendar. After you connect and grant Calendar permission, matched exams can sync automatically when you generate a routine. Events use reminders for email one day before and pop-ups 12 hours and one hour before, when those times are still in the future at sync time.
- **Optional Google access:** No Google account is needed for device uploads, public Drive links, or routine generation. Private Drive import and Calendar sync are separate optional permissions. Drive access does not imply Calendar access.

## Install ExamMate as an app

ExamMate remains available as a normal website. On supported browsers, you can also install it as a Progressive Web App (PWA) and launch it in a standalone window.

- **Windows, macOS, and Linux:** Open ExamMate in Chrome or another browser with PWA installation support, then choose **Install ExamMate** or **Install page as app** from the address bar or browser menu.
- **Android:** Open ExamMate in Chrome and choose **Install app** or **Add to Home screen**. On launchers that support web app shortcuts, long-press the installed ExamMate icon for **Generate routine** and **My schedule**. They open the matching sections on the ExamMate website.
- **iPhone and iPad:** Open ExamMate in Safari, tap **Share**, then **Add to Home Screen**. iOS opens it as a standalone web app; iOS does not provide the same manifest shortcut menu available on supporting Android/desktop launchers.

After the first successful online visit and service-worker installation, the offline workspace can show an unexpired routine previously saved in that same browser profile, preview a sample routine, or parse an uploaded Excel/CSV file on-device. Offline-generated real routines are saved locally for up to 15 days. Sample previews are temporary and are not saved. Once a routine is displayed, the offline workspace shows **Download PDF**, **Download PNG**, and **Print PDF**. PDF and PNG are created on-device and downloaded when selected; **Print PDF** is shown but disabled offline. On iOS, Safari may offer its download/share sheet rather than saving directly to Photos. PNG export is capped at 160 exams and also observes a canvas memory limit; download PDF for larger routines. The first visit, Google Drive import, Google sign-in/Calendar sync, and any live server feature still need an internet connection. The service worker caches only an explicit allowlist of public offline files and app icons; it never caches routine data, page HTML, API responses, or OAuth data. A routine created in a browser may be separate from the installed app's local storage on some platforms.

## Built with

- Next.js, React, TypeScript, Tailwind CSS, and DaisyUI
- Better Auth and MongoDB
- Google Calendar API and public Google Drive/Sheets sharing links
- SheetJS, jsPDF, and HTML Canvas



## Data and privacy

- Uploaded spreadsheet files are parsed in browser memory; the original upload is not stored as a server-side routine file.
- Generated routines are saved in the browser's local storage for up to 15 days and can be removed with **Clear My Data**.
- Device uploads are parsed in browser memory and are not uploaded to ExamMate. Public Drive links are fetched temporarily; private links use the user's server-stored Google OAuth authorization to read only the linked file ID, then the returned file is parsed in the browser. ExamMate does not list or search Drive, modify files, or retain imported files in its database.
- Google Calendar sync is optional. On an explicit sync action, ExamMate requests `openid`, `email`, `profile`, and `calendar.events.owned`. Google grants this Calendar scope the ability to view, create, change, and delete events on calendars the user owns. ExamMate's code uses it to create or update only the ExamMate exam events in the primary calendar; it does not list existing events or delete calendar events. Synced exam details are sent to Google and events remain there after disconnect.
- Google OAuth account/session records are stored server-side in MongoDB; Better Auth encrypts OAuth tokens at rest. Generated exam routines remain in browser local storage for up to 15 days.
- Vercel Analytics and Speed Insights are enabled for site usage/performance measurements.
- Google sign-in is optional for local spreadsheet parsing and schedule generation.
- Private Drive import requests `https://www.googleapis.com/auth/drive.readonly` only after the user chooses to import a private link and authorizes the account. This is a broad Google scope at the provider level because the Drive API does not offer a narrower arbitrary-pasted-file read scope; the app restricts its operation to the explicit file ID in the pasted URL and does not enumerate the user's files. Public-link import and local upload do not request this scope.
- Spreadsheet parsing validates file signatures and limits file size, workbook sheets/rows, archive entries, and expanded archive size. The offline view renders stored routine fields as text and validates their shape before display.
- The application uses a nonce-based Content Security Policy and standard browser security headers; API responses are marked private and non-cacheable. The service worker caches only the offline app shell and static export/parser assets, never personal routine or account data.

See the [Privacy Policy](https://exammate.triizync.com/privacy) and [Terms](https://exammate.triizync.com/terms) for more information. The policy is also linked from the application homepage and describes the Google data accessed, purpose, storage, and sharing.

## License

ExamMate's original project materials are proprietary and reserved by their respective rights holders. This repository does not grant permission to copy, modify, redistribute, or commercially use those materials. Third-party packages and the original routine script credited above remain subject to their own owners' rights and license terms.

Read the full [ExamMate License](LICENSE). For licensing questions, contact us at <a href="https://exammate.triizync.com/contact-email?subject=ExamMate%20License">exammate.support@gmail.com</a>.
