import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isTrustedMutationRequest, getClientIp, checkPersistentRateLimit } from "@/lib/api-security";

const MAX_REQUEST_BYTES = 512 * 1024;
const MAX_EXAMS_PER_SYNC = 100;

type Exam = {
  id: string;
  courseCode: string;
  courseTitle: string;
  date: string;
  startTime: string;
  endTime: string;
  faculty?: string;
  program?: string;
};

function eventId(id: string) {
  // Google Calendar event IDs may only contain base32hex characters (a-v, 0-9).
  // Keep the prefix within that alphabet; "exam" contains an invalid "x".
  return `e${createHash("sha256").update(id).digest("hex")}`;
}

function formatExamTime(time: string): string {
  const [hourText, minuteText] = time.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  const hour12 = hour % 12 || 12;
  const suffix = hour >= 12 ? "PM" : "AM";
  return `${hour12}:${String(minute).padStart(2, "0")} ${suffix}`;
}

function getUpcomingReminders(startDateTime: string, now = Date.now()) {
  const startMs = Date.parse(startDateTime);
  const candidates = [
    { method: "email" as const, minutes: 24 * 60 },
    { method: "popup" as const, minutes: 12 * 60 },
    { method: "popup" as const, minutes: 60 },
  ];

  return candidates.filter(({ minutes }) => startMs - minutes * 60_000 > now);
}

function escapeCalendarText(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character] ?? character);
}

function getGreetingName(name?: string | null, email?: string | null): string {
  const profileName = name?.trim();
  const emailName = email
    ?.split("@", 1)[0]
    ?.split("+", 1)[0]
    ?.replace(/[._-]+/g, " ")
    .trim();
  const source = profileName || emailName || "there";
  const parts = source.split(/\s+/).filter(Boolean);
  const selectedName = parts.length > 1 ? parts[parts.length - 1] : parts[0];

  if (!profileName && selectedName) {
    return selectedName.charAt(0).toUpperCase() + selectedName.slice(1);
  }
  return selectedName || "there";
}

async function readBoundedBody(request: Request): Promise<string> {
  const reader = request.body?.getReader();
  if (!reader) throw new Error("empty");
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_REQUEST_BYTES) {
        await reader.cancel();
        throw new Error("too_large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

function hasControlCharacters(value: string): boolean {
  return /[\u0000-\u001F\u007F]/.test(value);
}

export async function GET() {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session) {
      return NextResponse.json(
        { connected: false, hasCalendarScope: false },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }
    const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
    const googleAccount = accounts?.find((account) => account.providerId === "google");
    if (!googleAccount) {
      return NextResponse.json(
        { connected: false, hasCalendarScope: false },
        { headers: { "Cache-Control": "private, no-store" } }
      );
    }
    const scopes = googleAccount.scopes ?? [];
    const hasCalendarScope = scopes.some((scope) =>
      scope === "https://www.googleapis.com/auth/calendar" ||
      scope === "https://www.googleapis.com/auth/calendar.events"
    );
    return NextResponse.json(
      { connected: true, hasCalendarScope },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  } catch {
    return NextResponse.json(
      { connected: false, hasCalendarScope: false },
      { headers: { "Cache-Control": "private, no-store" } }
    );
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const clientIp = getClientIp(request);
  let rateLimit: { allowed: boolean };
  try {
    rateLimit = await checkPersistentRateLimit(`calendar_sync:ip:${clientIp}`, 12, 60 * 1000);
  } catch {
    return NextResponse.json({ error: "Calendar sync is temporarily unavailable." }, { status: 503 });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }
  if (!/^application\/json(?:\s*;|\s*$)/i.test(request.headers.get("content-type") ?? "")) {
    return NextResponse.json({ error: "Invalid content type." }, { status: 415 });
  }

  let session;
  let accounts;
  try {
    const requestHeaders = await headers();
    session = await auth.api.getSession({ headers: requestHeaders });
    if (session) accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
  } catch {
    return NextResponse.json(
      { error: "Could not verify Google connection." },
      { status: 503 }
    );
  }
  if (!session) return NextResponse.json({ error: "Connect Google to sync schedule." }, { status: 401 });

  try {
    const userRateLimit = await checkPersistentRateLimit(`calendar_sync:user:${session.user.id}`, 8, 60 * 1000);
    if (!userRateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch {
    return NextResponse.json({ error: "Calendar sync is temporarily unavailable." }, { status: 503 });
  }

  const googleAccount = accounts?.find((account) => account.providerId === "google");
  if (!googleAccount) return NextResponse.json({ error: "Connect Google account first." }, { status: 400 });

  let exams: Exam[];
  try {
    const contentLength = request.headers.get("content-length");
    if (contentLength && (!/^\d+$/.test(contentLength) || Number(contentLength) > MAX_REQUEST_BYTES)) {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    const bodyText = await readBoundedBody(request);
    const body = JSON.parse(bodyText) as { exams?: Exam[] };
    exams = body.exams ?? [];
    if (!Array.isArray(exams) || exams.length > MAX_EXAMS_PER_SYNC || exams.some((exam) =>
      !exam || typeof exam.id !== "string" || exam.id.length < 1 || exam.id.length > 256 ||
      !exam.id.trim() || hasControlCharacters(exam.id) ||
      typeof exam.courseCode !== "string" || exam.courseCode.trim().length < 1 || exam.courseCode.length > 64 || hasControlCharacters(exam.courseCode) ||
      typeof exam.courseTitle !== "string" || exam.courseTitle.trim().length < 1 || exam.courseTitle.length > 300 || hasControlCharacters(exam.courseTitle) ||
      (exam.faculty !== undefined && (typeof exam.faculty !== "string" || exam.faculty.length > 300 || hasControlCharacters(exam.faculty))) ||
      (exam.program !== undefined && (typeof exam.program !== "string" || exam.program.length > 150 || hasControlCharacters(exam.program))) ||
      !isValidIsoDate(exam.date) || !isValidTime(exam.startTime) || !isValidTime(exam.endTime) ||
      exam.endTime <= exam.startTime
    )) throw new Error("invalid");
    if (new Set(exams.map((exam) => exam.id)).size !== exams.length) throw new Error("duplicates");
  } catch (error) {
    if (error instanceof Error && error.message === "too_large") {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Exam schedule is invalid." }, { status: 400 });
  }
  if (!exams.length) return NextResponse.json({ synced: 0 });

  if (
    exams.some(
      (exam) =>
        exam.id?.startsWith("CSE101.1-2026-10-20") ||
        exam.id?.startsWith("CSE181.5-2026-10-31") ||
        exam.id?.startsWith("MAT101.2-2026-10-25")
    )
  ) {
    return NextResponse.json(
      { error: "Sample routines cannot sync to Google Calendar." },
      { status: 400 }
    );
  }

  let token;
  try {
    token = await auth.api.getAccessToken({
      body: { accountId: googleAccount.id },
      headers: await headers(),
    });
  } catch {
    return NextResponse.json(
      { error: "Google session expired. Please reconnect Google from navbar." },
      { status: 401 }
    );
  }

  if (!token?.accessToken) {
    return NextResponse.json(
      { error: "Google session expired. Please reconnect Google from navbar." },
      { status: 401 }
    );
  }

  try {
    let synced = 0;
    for (const exam of exams) {
      const start = `${exam.date}T${exam.startTime}:00+06:00`;
      const end = `${exam.date}T${exam.endTime}:00+06:00`;
      const courseTitle = escapeCalendarText(exam.courseTitle.trim());
      const courseCode = escapeCalendarText(exam.courseCode.trim());
      const title = `${courseTitle} (${courseCode})`;
      const examTime = `${formatExamTime(exam.startTime)} - ${formatExamTime(exam.endTime)}`;
      const greetingName = escapeCalendarText(
        getGreetingName(session.user.name, session.user.email),
      );
      const description = `Hello ${greetingName},<br>
This is a scheduled automated reminder from ExamMate.<br><br>
📌 <strong>EXAM DETAILS:</strong><br>
Course: ${title}<br>
Faculty: ${exam.faculty?.trim() ? escapeCalendarText(exam.faculty.trim()) : "Not listed in the routine"}<br>
Time: ${examTime}<br><br>
⚠️ <strong>CRITICAL CHECKLIST (Before entering the hall):</strong><br>
• Student ID &amp; Admit Card<br>
• Pens, Pencils &amp; necessary stationery<br>
• Calculator (If applicable)<br><br>
💡 <strong>Pro Tip:</strong> Please try to reach your designated exam venue at least 15–20 minutes early to avoid any last-minute rush.<br><br>
<strong>Wishing you the best of luck with your exam!</strong><br>
🚀 Powered by <a href="https://exammate.triizync.com/"><strong>ExamMate</strong></a>`;
      const requestedReminders = getUpcomingReminders(start, Date.now());
      const event = {
        id: eventId(exam.id),
        summary: `Reminder from ExamMate: ${title}`,
        description,
        start: { dateTime: start, timeZone: "Asia/Dhaka" },
        end: { dateTime: end, timeZone: "Asia/Dhaka" },
        reminders: {
          useDefault: false,
          // Google Calendar cannot send reminders for trigger times already past
          // when the user syncs; only keep reminder times that are still ahead.
          overrides: requestedReminders,
        },
      };
      const calendarUrl = "https://www.googleapis.com/calendar/v3/calendars/primary/events?fields=id,reminders";
      const requestOptions: RequestInit = {
        headers: { Authorization: `Bearer ${token.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(event),
        signal: AbortSignal.timeout(15_000),
      };
      let response = await fetch(calendarUrl, { ...requestOptions, method: "POST" });
      if (response.status === 409) {
        response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.id}?fields=id,reminders`,
          { ...requestOptions, method: "PATCH" }
        );
      }
      if (!response.ok) {
        const details = await response.json().catch(() => ({})) as { error?: { message?: string; status?: string } };
        const providerMessage = details.error?.message ?? "";
        if (details.error?.status === "SERVICE_DISABLED" || /has not been used|is disabled/i.test(providerMessage)) {
          return NextResponse.json({
            error: "Google Calendar API disabled for this project.",
          }, { status: 502 });
        }
        if (/insufficient|scope|permission_denied/i.test(providerMessage) || details.error?.status === "PERMISSION_DENIED") {
          return NextResponse.json({
            error: "Calendar permission denied. Please allow Calendar access.",
          }, { status: 403 });
        }
        return NextResponse.json({ error: "Could not save calendar event. Please retry." }, { status: 502 });
      }
      const savedEvent = await response.json().catch(() => null) as {
        reminders?: { overrides?: Array<{ method?: string; minutes?: number }> };
      } | null;
      const actualReminders = (savedEvent?.reminders?.overrides ?? [])
        .map(({ method, minutes }) => `${method}:${minutes}`)
        .sort();
      const expectedReminders = requestedReminders
        .map(({ method, minutes }) => `${method}:${minutes}`)
        .sort();
      if (
        !savedEvent ||
        actualReminders.length !== expectedReminders.length ||
        actualReminders.some((reminder, index) => reminder !== expectedReminders[index])
      ) {
        return NextResponse.json(
          { error: "Calendar saved the event but did not confirm all requested reminders. Please sync again." },
          { status: 502 }
        );
      }
      synced += 1;
    }
    return NextResponse.json({ synced });
  } catch (error) {
    return NextResponse.json({ error: "Google Calendar sync failed. Please retry." }, { status: 502 });
  }
}

function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year ?? 0, (month ?? 1) - 1, day ?? 0));
  return date.getUTCFullYear() === year && date.getUTCMonth() === (month ?? 0) - 1 && date.getUTCDate() === day;
}

function isValidTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hour, minute] = value.split(":").map(Number);
  return (hour ?? 24) < 24 && (minute ?? 60) < 60;
}
