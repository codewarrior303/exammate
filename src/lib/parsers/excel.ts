import type { ParsedExam } from "@/lib/parsers/normalize";
import {
  extractCourseCodes,
  extractDateFromText,
  extractTimeFromText,
  findHeaderRow,
  normalizeRow,
} from "@/lib/parsers/normalize";

const MAX_SHEETS = 30;
const MAX_ROWS_PER_SHEET = 2_000;
const MAX_FILE_BYTES = 15 * 1024 * 1024;
const MAX_ZIP_ENTRIES = 256;
const MAX_UNPACKED_BYTES = 32 * 1024 * 1024;
const MAX_EXAMS = 2_000;

function validateFileBasics(file: File): string {
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File exceeds the 15 MB upload limit.");
  }

  const extension = file.name.toLowerCase().split(".").pop();
  if (!["xlsx", "xls", "xlsm", "csv"].includes(extension ?? "")) {
    throw new Error("Unsupported file type. Upload an Excel file or CSV.");
  }
  return extension!;
}

function validateWorkbookArchive(buffer: ArrayBuffer): void {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const minimumEocdOffset = Math.max(0, bytes.length - 22 - 65_535);
  let eocdOffset = -1;

  for (let offset = bytes.length - 22; offset >= minimumEocdOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocdOffset = offset;
      break;
    }
  }
  if (eocdOffset < 0 || eocdOffset + 22 > bytes.length) {
    throw new Error("This Excel workbook archive is invalid.");
  }

  const diskNumber = view.getUint16(eocdOffset + 4, true);
  const centralDirectoryDisk = view.getUint16(eocdOffset + 6, true);
  const entriesOnDisk = view.getUint16(eocdOffset + 8, true);
  const entryCount = view.getUint16(eocdOffset + 10, true);
  const directorySize = view.getUint32(eocdOffset + 12, true);
  const directoryOffset = view.getUint32(eocdOffset + 16, true);

  if (
    diskNumber !== 0 ||
    centralDirectoryDisk !== 0 ||
    entriesOnDisk !== entryCount ||
    entryCount === 0xffff ||
    directorySize === 0xffffffff ||
    directoryOffset === 0xffffffff ||
    entryCount > MAX_ZIP_ENTRIES ||
    directoryOffset + directorySize > eocdOffset
  ) {
    throw new Error("This Excel workbook archive exceeds the supported limits.");
  }

  let offset = directoryOffset;
  let unpackedBytes = 0;
  for (let index = 0; index < entryCount; index += 1) {
    if (offset + 46 > eocdOffset || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("This Excel workbook archive is invalid.");
    }

    const flags = view.getUint16(offset + 8, true);
    const unpackedSize = view.getUint32(offset + 24, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const entryLength = 46 + fileNameLength + extraLength + commentLength;

    if (
      (flags & 0x0001) !== 0 ||
      unpackedSize === 0xffffffff ||
      offset + entryLength > eocdOffset
    ) {
      throw new Error("Encrypted or unsupported Excel archive entries are not allowed.");
    }

    unpackedBytes += unpackedSize;
    if (unpackedBytes > MAX_UNPACKED_BYTES) {
      throw new Error("The workbook expands beyond the 32 MB safety limit.");
    }
    offset += entryLength;
  }

  if (offset !== directoryOffset + directorySize) {
    throw new Error("This Excel workbook archive is invalid.");
  }
}

function cellValue(row: unknown[], column: number | undefined): string {
  if (column === undefined) return "";
  const value = row[column];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export async function parseExcelFile(file: File): Promise<ParsedExam[]> {
  const extension = validateFileBasics(file);
  const signature = new Uint8Array(await file.slice(0, 8).arrayBuffer());
  const isZip =
    signature[0] === 0x50 &&
    signature[1] === 0x4b &&
    ([0x03, 0x05, 0x07].includes(signature[2] ?? -1)) &&
    ([0x04, 0x06, 0x08].includes(signature[3] ?? -1));
  const isLegacyExcel =
    signature[0] === 0xd0 &&
    signature[1] === 0xcf &&
    signature[2] === 0x11 &&
    signature[3] === 0xe0 &&
    signature[4] === 0xa1 &&
    signature[5] === 0xb1 &&
    signature[6] === 0x1a &&
    signature[7] === 0xe1;
  if ((extension === "xlsx" || extension === "xlsm") && !isZip) {
    throw new Error("This file does not appear to be a valid Excel workbook.");
  }
  if (extension === "xls" && !isLegacyExcel) {
    throw new Error("This file does not appear to be a valid legacy Excel workbook.");
  }
  if (extension === "csv" && (isZip || isLegacyExcel)) {
    throw new Error("The file content does not match its .csv extension.");
  }

  const arrayBuffer = await file.arrayBuffer();
  if (extension === "xlsx" || extension === "xlsm") {
    validateWorkbookArchive(arrayBuffer);
  }
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(arrayBuffer, {
    type: "array",
    cellDates: true,
    sheetRows: MAX_ROWS_PER_SHEET,
    // Routine import only needs cell values; never load macros or formula metadata.
    cellFormula: false,
    bookVBA: false,
    bookFiles: false,
  });
  if (workbook.SheetNames.length > MAX_SHEETS) {
    throw new Error(`The workbook has too many sheets (maximum ${MAX_SHEETS}).`);
  }
  const exams = new Map<string, ParsedExam>();
  let foundRoutineHeaders = false;

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
      header: 1,
      defval: "",
      raw: false,
      blankrows: false,
    });
    const header = findHeaderRow(rows);
    if (!header) continue;

    foundRoutineHeaders = true;
    let previousDate = "";
    let previousTime = "";
    let previousStartTime = "";
    let previousEndTime = "";

    const skipRows = header.headerRowCount ?? 1;
    for (const row of rows.slice(header.index + skipRows)) {
      // 1. Course code
      let courseCode = cellValue(row, header.columns.courseCode);
      if (!courseCode) {
        for (const cell of row) {
          const found = extractCourseCodes(String(cell ?? ""));
          if (found.length > 0) {
            courseCode = found[0].code;
            break;
          }
        }
      }

      // 2. Date
      const dateCell = cellValue(row, header.columns.date);
      if (dateCell && dateCell !== previousDate) {
        previousDate = dateCell;
        previousTime = "";
        previousStartTime = "";
        previousEndTime = "";
      } else if (!previousDate) {
        const detected = extractDateFromText(row.map((c) => String(c ?? "")).join(" "));
        if (detected) previousDate = detected.raw;
      }
      const rawDate = dateCell || previousDate;

      // 3. Time (support both generic Time slot and separate Start/End Time columns)
      const timeCell = cellValue(row, header.columns.time);
      const startCell = cellValue(row, header.columns.startTime);
      const endCell = cellValue(row, header.columns.endTime);

      if (timeCell) previousTime = timeCell;
      if (startCell) previousStartTime = startCell;
      if (endCell) previousEndTime = endCell;

      if (!timeCell && !startCell && !endCell && !previousTime && (!previousStartTime || !previousEndTime)) {
        const detectedTime = extractTimeFromText(row.map((c) => String(c ?? "")).join(" "));
        if (detectedTime) {
          previousTime = detectedTime.raw;
          previousStartTime = detectedTime.start;
          previousEndTime = detectedTime.end;
        }
      }

      const rawTime = timeCell || previousTime;
      const rawStartTime = startCell || previousStartTime;
      const rawEndTime = endCell || previousEndTime;

      if (!courseCode || !rawDate) continue;

      const exam = normalizeRow({
        courseCode,
        courseTitle: cellValue(row, header.columns.courseTitle),
        date: rawDate,
        time: rawTime,
        startTime: rawStartTime,
        endTime: rawEndTime,
        faculty: cellValue(row, header.columns.faculty),
        program: cellValue(row, header.columns.program),
        section: cellValue(row, header.columns.section),
      });

      if (exam) {
        exams.set(exam.id, exam);
        if (exams.size > MAX_EXAMS) {
          throw new Error(`This routine contains too many exams (maximum ${MAX_EXAMS}).`);
        }
      }
    }
  }

  if (!foundRoutineHeaders) {
    throw new Error(
      "Couldn't find a routine table in this Excel file. Ensure there is a header row with Course Code, Date, and Time.",
    );
  }

  if (!exams.size) {
    throw new Error(
      "Routine headers were found in the Excel file, but no complete exam rows could be read. Check that each row includes a course code, date, and time.",
    );
  }

  return [...exams.values()];
}
