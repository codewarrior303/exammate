import { parseExcelFile } from "/offline/excel-parser.js";
import { downloadPdf, downloadPng } from "/offline/exporter.js";

const STORAGE_KEY = "examMate:routine:v1";
const ROUTINE_DAYS = 15;
const input = document.querySelector("#routine-file");
const codesInput = document.querySelector("#course-codes");
const generateButton = document.querySelector("#generate");
const sampleButton = document.querySelector("#sample");
const clearButton = document.querySelector("#clear");
const pdfButton = document.querySelector("#download-pdf");
const pngButton = document.querySelector("#download-png");
const printButton = document.querySelector("#print-pdf");
const exportActions = document.querySelector("#export-actions");
const statusNode = document.querySelector("#status");
const tableContainer = document.querySelector("#table-container");
const workspace = document.querySelector("#offline-workspace");
const privacyPage = document.querySelector("#offline-privacy");
const termsPage = document.querySelector("#offline-terms");
const licensePage = document.querySelector("#offline-license");

const currentOfflinePage = location.pathname === "/privacy"
  ? "privacy"
  : location.pathname === "/terms"
    ? "terms"
    : location.pathname === "/license"
      ? "license"
      : "home";
workspace.hidden = currentOfflinePage !== "home";
privacyPage.hidden = currentOfflinePage !== "privacy";
termsPage.hidden = currentOfflinePage !== "terms";
licensePage.hidden = currentOfflinePage !== "license";

let parsedExams = [];
let currentExams = [];

function status(message) {
  statusNode.textContent = message;
}

function safeRoutine(value) {
  if (!value || typeof value !== "object" || value.version !== 1 || !Array.isArray(value.exams) || value.exams.length > 2000) return null;
  const expiry = Date.parse(value.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= Date.now()) return null;
  const exams = value.exams.filter((exam) =>
    exam &&
    typeof exam.id === "string" && exam.id.length <= 256 &&
    typeof exam.courseCode === "string" && exam.courseCode.length <= 64 &&
    typeof exam.courseTitle === "string" && exam.courseTitle.length <= 512 &&
    typeof exam.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(exam.date) &&
    typeof exam.startTime === "string" && exam.startTime.length <= 32 &&
    typeof exam.endTime === "string" && exam.endTime.length <= 32 &&
    typeof exam.faculty === "string" && exam.faculty.length <= 256 &&
    typeof exam.program === "string" && exam.program.length <= 256,
  );
  return exams.length ? exams : null;
}

function loadSavedRoutine() {
  try {
    const value = safeRoutine(JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"));
    if (value) {
      currentExams = value.exams;
      renderTable(currentExams);
      status(`Showing your saved routine (${currentExams.length} exams).`);
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
    currentExams = [];
    renderTable([]);
    status("No unexpired saved routine found. Upload a file or try a sample routine.");
  } catch {
    currentExams = [];
    status("Browser storage is unavailable. You can still generate a temporary routine.");
  }
}

function saveRoutine(exams) {
  const now = new Date();
  const payload = {
    version: 1,
    savedAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + ROUTINE_DAYS * 86400000).toISOString(),
    exams,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function dateLabel(exam) {
  const date = new Date(`${exam.date}T12:00:00`);
  if (Number.isNaN(date.getTime())) return exam.displayDate || exam.date;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short", year: "numeric", month: "short", day: "numeric",
  }).format(date);
}

function renderTable(exams) {
  tableContainer.replaceChildren();
  exportActions.hidden = exams.length === 0;
  pdfButton.disabled = exams.length === 0;
  pngButton.disabled = exams.length === 0;
  printButton.disabled = true;
  if (!exams.length) return;

  const table = document.createElement("table");
  const head = document.createElement("thead");
  const headerRow = document.createElement("tr");
  for (const label of ["DATE", "TIME", "COURSE", "COURSE TITLE", "FACULTY"]) {
    const th = document.createElement("th");
    th.textContent = label;
    headerRow.append(th);
  }
  head.append(headerRow);
  const body = document.createElement("tbody");
  for (const exam of exams) {
    const row = document.createElement("tr");
    for (const value of [
      dateLabel(exam),
      `${exam.startTime} – ${exam.endTime}`,
      exam.courseCode,
      exam.courseTitle,
      exam.faculty || "—",
    ]) {
      const cell = document.createElement("td");
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
  table.append(head, body);
  tableContainer.append(table);
}

pdfButton.addEventListener("click", () => {
  try {
    downloadPdf(currentExams);
    status("PDF download started.");
  } catch (error) {
    status(error instanceof Error ? error.message : "Could not create the PDF.");
  }
});

pngButton.addEventListener("click", async () => {
  pngButton.disabled = true;
  try {
    await downloadPng(currentExams);
    status("PNG download started.");
  } catch (error) {
    status(error instanceof Error ? error.message : "Could not create the PNG.");
  } finally {
    pngButton.disabled = currentExams.length === 0;
  }
});

function filteredExams(exams) {
  const wanted = codesInput.value
    .split(/[\s,;]+/)
    .map((code) => code.trim().toUpperCase())
    .filter(Boolean);
  if (!wanted.length) return exams;
  return exams.filter((exam) => wanted.includes(exam.courseCode.toUpperCase()));
}

input.addEventListener("change", async () => {
  const file = input.files?.[0];
  parsedExams = [];
  generateButton.disabled = true;
  if (!file) return;
  status("Checking and parsing this file on your device. Macros and scripts are not run…");
  try {
    parsedExams = await parseExcelFile(file);
    generateButton.disabled = false;
    status(`${parsedExams.length} exam rows parsed locally. Add course codes if you want to filter, then generate.`);
  } catch (error) {
    status(error instanceof Error ? error.message : "Could not parse this routine file.");
  }
});

generateButton.addEventListener("click", () => {
  const matches = filteredExams(parsedExams);
  if (!matches.length) {
    status("No exams matched those course codes. Check the codes or leave the field empty to show all parsed exams.");
    return;
  }
  currentExams = matches;
  renderTable(matches);
  try {
    saveRoutine(matches);
    status(`${matches.length} exams generated offline and saved on this device for up to 15 days.`);
  } catch {
    status(`${matches.length} exams generated for this session. Browser storage could not save them.`);
  }
});

sampleButton.addEventListener("click", () => {
  const today = new Date();
  const dateAt = (days) => {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + days, 12);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  };
  const sample = [
    { id: `CSE181.5-${dateAt(2)}-09:00`, courseCode: "CSE181.5", courseTitle: "Discrete Mathematics", date: dateAt(2), startTime: "09:00 AM", endTime: "11:00 AM", faculty: "[MAHB] Mahbub Hasan", program: "B.Sc. in CSE" },
    { id: `CSE263.6-${dateAt(3)}-09:00`, courseCode: "CSE263.6", courseTitle: "Digital Logic Design", date: dateAt(3), startTime: "09:00 AM", endTime: "11:00 AM", faculty: "[TAJO] Tanjina Oriana", program: "B.Sc. in CSE" },
  ];
  currentExams = filteredExams(sample);
  renderTable(currentExams);
  status(currentExams.length ? "Sample routine generated offline. This preview is temporary and was not saved." : "No sample exam matched those course codes. Clear the course-code filter to preview the sample.");
});

clearButton.addEventListener("click", () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Continue clearing this in-memory view even if storage is unavailable.
  }
  parsedExams = [];
  currentExams = [];
  input.value = "";
  codesInput.value = "";
  generateButton.disabled = true;
  renderTable([]);
  status("Saved routine cleared from this device.");
});

loadSavedRoutine();
