import { NextRequest, NextResponse } from "next/server";
import { getDueReminders, markReminderSent } from "@/lib/reminders";
import { sendExamReminderEmail, resetProviderExhaustion } from "@/lib/email";

export const dynamic = "force-dynamic";

async function handleReminders(request: NextRequest) {
  // Validate authorization token if CRON_SECRET is configured
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = request.headers.get("authorization");
    const queryKey = request.nextUrl.searchParams.get("key") || request.nextUrl.searchParams.get("secret");
    const isAuthorized = authHeader === `Bearer ${cronSecret}` || queryKey === cronSecret;
    if (!isAuthorized) {
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

    resetProviderExhaustion();
    let sent = 0;
    let failed = 0;
    let deferred = 0;
    let allQuotaExhausted = false;

    // Group due reminders by userEmail so users with multiple exams receive one consolidated email
    const userGroups = new Map<string, typeof dueReminders>();
    for (const reminder of dueReminders) {
      const email = reminder.userEmail.toLowerCase().trim();
      const list = userGroups.get(email) ?? [];
      list.push(reminder);
      userGroups.set(email, list);
    }

    for (const [userEmail, reminders] of userGroups) {
      if (allQuotaExhausted) {
        deferred += reminders.length;
        continue;
      }

      const result = await sendExamReminderEmail({
        to: userEmail,
        studentName: reminders[0].studentName,
        exams: reminders.map((r) => ({
          courseCode: r.courseCode,
          courseTitle: r.courseTitle,
          faculty: r.faculty,
          examDateFormatted: r.examDateFormatted,
          examTimeFormatted: r.examTimeFormatted,
        })),
      });

      if (result.success) {
        for (const r of reminders) {
          if (r._id) {
            await markReminderSent(r._id);
          }
        }
        sent += reminders.length;
      } else if (result.error === "ALL_PROVIDERS_EXHAUSTED" || result.allExhausted) {
        console.warn(
          `[Cron Reminders] All email providers exhausted daily sending limits. Safely deferring remaining reminders without dropping data.`,
        );
        allQuotaExhausted = true;
        deferred += reminders.length;
      } else {
        console.error(`Failed to send reminder for ${userEmail}:`, result.error);
        failed += reminders.length;
      }
    }

    return NextResponse.json({
      ok: true,
      total: dueReminders.length,
      sent,
      failed,
      deferred,
      quotaExhausted: allQuotaExhausted,
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
