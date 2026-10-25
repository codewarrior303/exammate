import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import type { ParsedExam } from "@/lib/parsers/normalize";

const MAX_PNG_EXAMS = 160;

function examDate(dateValue: string, displayDate?: string): { label: string; day: string } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
  if (!match) return { label: displayDate || dateValue, day: "" };
  const [, year, month, day] = match;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12));
  return {
    label:
      displayDate ||
      new Intl.DateTimeFormat("en-GB", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        timeZone: "UTC",
      }).format(date),
    day: new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      timeZone: "UTC",
    }).format(date),
  };
}

function timeLabel(value: string): string {
  const match = /^(\d{1,2}):(\d{2})(?:\s*(AM|PM))?$/i.exec(value.trim());
  if (!match) return value;
  const hour = Number(match[1]);
  const suffix = match[3]?.toUpperCase() || (hour >= 12 ? "PM" : "AM");
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${match[2]} ${suffix}`;
}

function rows(exams: ParsedExam[]) {
  return exams.map((exam) => {
    const date = examDate(exam.date, exam.displayDate);
    return [
      date.label,
      date.day,
      `${timeLabel(exam.startTime)} – ${timeLabel(exam.endTime)}`,
      exam.courseCode,
      exam.courseTitle,
      exam.faculty?.trim() || "—",
    ];
  });
}

export function downloadPdf(exams: ParsedExam[]): void {
  if (!exams.length) throw new Error("Generate a routine before exporting PDF.");
  const doc = new jsPDF({ orientation: "landscape" });
  doc.setProperties({
    title: "ExamMate-Schedule",
    subject: "ExamMate exam schedule",
    creator: "ExamMate",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.setTextColor(15, 45, 42);
  doc.text("Exam Routine", 14, 19);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(92, 111, 108);
  doc.text(`Generated: ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date())}`, 14, 27);
  doc.setDrawColor(94, 234, 212);
  doc.setLineWidth(0.8);
  doc.line(14, 32, pageWidth - 14, 32);

  autoTable(doc, {
    head: [["Date", "Day", "Time", "Course", "Course Title", "Faculty"]],
    body: rows(exams),
    startY: 39,
    styles: {
      font: "helvetica",
      fontSize: 9,
      cellPadding: 3.5,
      textColor: [38, 52, 50],
      lineColor: [220, 232, 229],
      lineWidth: 0.2,
      overflow: "linebreak",
    },
    headStyles: { fillColor: [14, 116, 104], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: {
      0: { cellWidth: 27 },
      1: { cellWidth: 29 },
      2: { cellWidth: 43 },
      3: { cellWidth: 29 },
      4: { cellWidth: 98 },
      5: { cellWidth: 43 },
    },
    margin: { left: 14, right: 14, bottom: 20 },
    alternateRowStyles: { fillColor: [241, 249, 247] },
  });

  doc.save("ExamMate-Schedule.pdf");
}

function wrapCanvasText(
  context: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string[] {
  const words = value.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && context.measureText(next).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

export async function downloadPng(exams: ParsedExam[]): Promise<void> {
  if (!exams.length) throw new Error("Generate a routine before exporting PNG.");
  if (exams.length > MAX_PNG_EXAMS) {
    throw new Error(`PNG export supports up to ${MAX_PNG_EXAMS} exams at a time. Download the PDF for a larger routine.`);
  }

  const width = 1600;
  const padding = 48;
  const tableWidth = width - padding * 2;
  const columns = [
    { header: "DATE", width: 150 },
    { header: "DAY", width: 160 },
    { header: "TIME", width: 220 },
    { header: "COURSE", width: 170 },
    { header: "COURSE TITLE", width: 500 },
    { header: "FACULTY", width: tableWidth - 1200 },
  ];
  measureContext.font = "17px Arial, sans-serif";
  const preparedRows = rows(exams).map((row) => {
    const wrapped = row.map((value, index) => {
      const column = columns[index];
      return column ? wrapCanvasText(measureContext, value, column.width - 24) : [value];
    });
    return { values: wrapped, height: Math.max(58, ...wrapped.map((lines) => lines.length * 22 + 24)) };
  });
  const headerHeight = 76;
  const titleHeight = 150;
  const tableHeight = preparedRows.reduce((sum, row) => sum + row.height, headerHeight);
  const footerHeight = 58;
  const height = titleHeight + tableHeight + footerHeight;
  const maxCanvasDimension = 32767;
  const maxCanvasPixels = 14_000_000;
  if (height > maxCanvasDimension || width * height > maxCanvasPixels) {
    throw new Error("This routine is too large for a single PNG. Download the PDF instead.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not prepare the PNG on this device.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.fillStyle = "#0f2d2a";
  context.font = "700 42px Arial, sans-serif";
  context.fillText("Exam Routine", padding, 62);
  context.fillStyle = "#5c6f6c";
  context.font = "20px Arial, sans-serif";
  context.fillText(`Generated: ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(new Date())}`, padding, 101);
  context.fillStyle = "#5eead4";
  context.fillRect(padding, 127, tableWidth, 3);

  let y = titleHeight;
  context.fillStyle = "#0e7468";
  context.fillRect(padding, y, tableWidth, headerHeight);
  context.fillStyle = "#ffffff";
  context.font = "700 17px Arial, sans-serif";
  context.textBaseline = "middle";
  let x = padding;
  for (const column of columns) {
    context.fillText(column.header, x + 12, y + headerHeight / 2);
    x += column.width;
  }
  y += headerHeight;

  context.font = "17px Arial, sans-serif";
  for (let rowIndex = 0; rowIndex < preparedRows.length; rowIndex += 1) {
    const row = preparedRows[rowIndex];
    context.fillStyle = rowIndex % 2 ? "#f1f9f7" : "#ffffff";
    context.fillRect(padding, y, tableWidth, row.height);
    context.strokeStyle = "#dce8e5";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(padding, y + row.height);
    context.lineTo(width - padding, y + row.height);
    context.stroke();

    x = padding;
    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const lines = row.values[columnIndex] ?? [""];
      context.fillStyle = columnIndex === 3 ? "#0e7468" : "#263432";
      context.font = columnIndex === 3 ? "700 17px Arial, sans-serif" : "17px Arial, sans-serif";
      const lineHeight = 22;
      const textHeight = lines.length * lineHeight;
      let textY = y + (row.height - textHeight) / 2 + lineHeight / 2;
      for (const line of lines) {
        context.fillText(line, x + 12, textY, columns[columnIndex]!.width - 24);
        textY += lineHeight;
      }
      x += columns[columnIndex]!.width;
    }
    y += row.height;
  }

  context.strokeStyle = "#0e7468";
  context.lineWidth = 2;
  context.strokeRect(padding, titleHeight, tableWidth, tableHeight);
  context.strokeStyle = "#dce8e5";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(padding, height - footerHeight + 8);
  context.lineTo(width - padding, height - footerHeight + 8);
  context.stroke();
  context.fillStyle = "#697a76";
  context.textAlign = "right";
  context.font = "16px Arial, sans-serif";
  context.fillText("ExamMate", width - padding, height - 22);

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((value) => (value ? resolve(value) : reject(new Error("Could not create the PNG file."))), "image/png");
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ExamMate-Schedule.png";
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

const measureCanvas = document.createElement("canvas");
const measureContext = measureCanvas.getContext("2d")!;
