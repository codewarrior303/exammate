import { downloadPdf, downloadPng } from "/offline/exporter.js";

const STORAGE_KEY = "examMate:routine:v1";
const MAX_EXAMS = 2000;
const workspace = document.querySelector("#offline-workspace");
const emptyState = document.querySelector("#empty-state");
const tableContainer = document.querySelector("#table-container");
const exportActions = document.querySelector("#export-actions");
const pdfButton = document.querySelector("#download-pdf");
const pngButton = document.querySelector("#download-png");
const statusNode = document.querySelector("#status");
const loader = document.querySelector("#offline-loader");
const progressBar = document.querySelector("#progress-bar");
const progressValue = document.querySelector("#progress-value");

function validExam(exam) {
  return Boolean(
    exam &&
    typeof exam === "object" &&
    typeof exam.courseCode === "string" && exam.courseCode.length <= 64 &&
    typeof exam.courseTitle === "string" && exam.courseTitle.length <= 512 &&
    typeof exam.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(exam.date) &&
    typeof exam.startTime === "string" && exam.startTime.length <= 32 &&
    typeof exam.endTime === "string" && exam.endTime.length <= 32 &&
    typeof exam.faculty === "string" && exam.faculty.length <= 256 &&
    (exam.displayDate === undefined || (typeof exam.displayDate === "string" && exam.displayDate.length <= 64))
  );
}

function loadRoutine() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const expiresAt = Date.parse(saved?.expiresAt);
    if (saved?.version !== 1 || !Array.isArray(saved.exams) || saved.exams.length > MAX_EXAMS || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      localStorage.removeItem(STORAGE_KEY);
      return [];
    }
    const exams = saved.exams.filter(validExam);
    if (!exams.length) localStorage.removeItem(STORAGE_KEY);
    return exams;
  } catch {
    return [];
  }
}

function dateLabel(exam) {
  if (exam.displayDate?.trim()) return exam.displayDate.trim().replace(/(\d)\.(?=\d)/g, "$1/");
  const [year, month, day] = exam.date.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric", timeZone: "UTC",
  }).format(date);
}

function dayLabel(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long", timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day, 12)));
}

function timeLabel(value) {
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(value.trim());
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = match[3]?.toUpperCase() || (hour >= 12 ? "PM" : "AM");
  return `${hour % 12 || 12}:${match[2]} ${suffix}`;
}

function renderTable(exams) {
  const table = document.createElement("table");
  const head = document.createElement("thead");
  const header = document.createElement("tr");
  for (const label of ["DATE", "DAY", "TIME", "COURSE", "COURSE TITLE", "FACULTY"]) {
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = label;
    header.append(cell);
  }
  head.append(header);
  const body = document.createElement("tbody");
  for (const exam of exams) {
    const row = document.createElement("tr");
    const values = [
      [dateLabel(exam), ""],
      [dayLabel(exam.date), ""],
      [`${timeLabel(exam.startTime)} – ${timeLabel(exam.endTime)}`, "time"],
      [exam.courseCode, "code"],
      [exam.courseTitle, ""],
      [exam.faculty.trim() || "—", ""],
    ];
    for (const [value, className] of values) {
      const cell = document.createElement("td");
      if (className) cell.className = className;
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  }
  table.append(head, body);
  tableContainer.replaceChildren(table);
}

const exams = loadRoutine();
if (exams.length) {
  workspace.hidden = false;
  exportActions.hidden = false;
  document.querySelector("#generated-date").textContent = new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric", year: "numeric",
  }).format(new Date());
  renderTable(exams);
} else {
  emptyState.hidden = false;
}

pdfButton.addEventListener("click", () => {
  try {
    downloadPdf(exams);
    statusNode.textContent = "PDF download started.";
  } catch (error) {
    statusNode.textContent = error instanceof Error ? error.message : "Could not create the PDF.";
  }
});

pngButton.addEventListener("click", async () => {
  pngButton.disabled = true;
  try {
    await downloadPng(exams);
    statusNode.textContent = "PNG download started.";
  } catch (error) {
    statusNode.textContent = error instanceof Error ? error.message : "Could not create the PNG.";
  } finally {
    pngButton.disabled = false;
  }
});

let progress = 0;
const progressTimer = window.setInterval(() => {
  progress = Math.min(100, progress + 10);
  progressBar.style.transform = `scaleX(${progress / 100})`;
  progressValue.textContent = `${progress}%`;
  if (progress >= 100) {
    window.clearInterval(progressTimer);
    window.setTimeout(() => {
      loader.classList.add("done");
      window.setTimeout(() => loader.remove(), 220);
    }, 80);
  }
}, 24);
