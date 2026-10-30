import { NextRequest, NextResponse } from "next/server";
import { getDueReminders, markReminderSent } from "@/lib/reminders";
import { sendExamReminderEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

async function handleReminders(request: NextRequest) {
  // Validate authorization token if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (process.env.NODE_ENV === "production") {
    // In production, prevent unprotected open execution if CRON_SECRET was forgotten
    return NextResponse.json({ error: "CRON_SECRET is required in production." }, { status: 401 });
  }

  try {
    const dueReminders = await getDueReminders();
    if (!dueReminders.length) {
      return NextResponse.json({
        ok: true,
        message: "No exam reminders due at this time.",
        sent: 0,
        total: 0,
      });
    }

    let sent = 0;
    let failed = 0;

    for (const reminder of dueReminders) {
      if (!reminder._id) continue;

      const result = await sendExamReminderEmail({
        to: reminder.userEmail,
        studentName: reminder.studentName,
        courseCode: reminder.courseCode,
        courseTitle: reminder.courseTitle,
        faculty: reminder.faculty,
        examDateFormatted: reminder.examDateFormatted,
        examTimeFormatted: reminder.examTimeFormatted,
      });

      if (result.success) {
        await markReminderSent(reminder._id);
        sent += 1;
      } else {
        console.error(`Failed to send reminder for ${reminder.courseCode} to ${reminder.userEmail}:`, result.error);
        failed += 1;
      }
    }

    return NextResponse.json({
      ok: true,
      total: dueReminders.length,
      sent,
      failed,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error executing reminder cron job:", error);
    return NextResponse.json(
      { error: "Internal server error while processing reminders." },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  return handleReminders(request);
}

export async function POST(request: NextRequest) {
  return handleReminders(request);
}
