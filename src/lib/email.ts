import nodemailer from "nodemailer";
import path from "node:path";
import { existsSync } from "node:fs";

export interface ExamReminderEmailParams {
  to: string;
  studentName: string;
  courseCode: string;
  courseTitle: string;
  faculty?: string;
  examDateFormatted: string;
  examTimeFormatted: string;
}

function getTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass },
  });
}

function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] ?? char);
}

export async function sendExamReminderEmail(params: ExamReminderEmailParams): Promise<{ success: boolean; error?: string }> {
  const transporter = getTransporter();
  if (!transporter) {
    return { success: false, error: "Email credentials not configured in EMAIL_USER and EMAIL_PASS." };
  }

  const { to, studentName, courseCode, courseTitle, faculty, examDateFormatted, examTimeFormatted } = params;
  const fromAddress = process.env.EMAIL_USER;
  const subject = `Reminder from ExamMate: ${courseTitle} (${courseCode})`;

  const logoPath = path.join(process.cwd(), "public/icons/email-logo.png");
  const hasLocalLogo = existsSync(logoPath);

  const textBody = `Hello ${studentName},

Hope your exam preparation is going smoothly.
This is a friendly automated reminder from ExamMate that you have an upcoming exam scheduled for tomorrow.

📌 Exam Schedule & Details:

Course: ${courseTitle} (${courseCode})
${faculty ? `Faculty: ${faculty}\n` : ""}Date: ${examDateFormatted}
Time: ${examTimeFormatted}

⚠️ Checklist Before Entering the Hall:

• Student ID Card & Admit Card.
• Necessary stationery (pens, pencils, ruler).
• Approved calculator (if permitted for this exam).
• Arrive at the exam hall at least 20 minutes before start time.

Best of luck! 🎯

Warm regards,
Team ExamMate
https://exammate.triizync.com
`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a1118;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer Wrapper matching website background (#0a1118 to #060b10) -->
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0a1118;background:linear-gradient(180deg,#0e1d27 0%,#0a1118 60%,#060b10 100%);padding:40px 16px;">
    <tr>
      <td align="center">
        
        <!-- Header outside the white card (Programming Hero style + 2nd pic logo badge) -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;margin-bottom:26px;text-align:center;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  ${hasLocalLogo ? `
                  <td valign="middle" style="vertical-align:middle;padding-right:10px;">
                    <!-- Logo badge container matching website 2nd picture -->
                    <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="background-color:#0e1f29;border:1px solid rgba(94,234,212,0.45);border-radius:12px;box-shadow:0 0 16px rgba(94,234,212,0.15);">
                      <tr>
                        <td align="center" valign="middle" style="padding:6px 7px;line-height:0;">
                          <img src="cid:exammate-logo" alt="ExamMate Logo" width="22" height="26" style="display:block;border:0;outline:none;width:22px;height:26px;" />
                        </td>
                      </tr>
                    </table>
                  </td>
                  ` : ""}
                  <td valign="middle" style="vertical-align:middle;line-height:1;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:25px;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">
                      Exam<span style="color:#5eead4;">Mate</span>
                    </span>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px;color:#94a3b8;margin-top:7px;font-weight:400;letter-spacing:0.02em;">
                Your Smart Exam Companion
              </div>
            </td>
          </tr>
        </table>

        <!-- Center Premium White Card (Pure white, natural text flow like Programming Hero) -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:16px;border-collapse:separate;box-shadow:0 12px 36px rgba(0,0,0,0.35);overflow:hidden;">
          <tr>
            <td style="padding:36px 32px 32px;color:#1e293b;line-height:1.65;font-size:14.5px;">
              
              <!-- Greeting -->
              <h2 style="margin:0 0 14px 0;color:#0f172a;font-size:18px;font-weight:700;">
                Hello ${escapeHtml(studentName)},
              </h2>
              
              <p style="margin:0 0 12px 0;color:#334155;font-size:14.5px;line-height:1.65;">
                Hope your exam preparation is going smoothly.
              </p>
              
              <p style="margin:0 0 22px 0;color:#334155;font-size:14.5px;line-height:1.65;">
                This is a friendly automated reminder from <strong>ExamMate</strong> that you have an upcoming exam scheduled for tomorrow.
              </p>

              <!-- Exam Schedule & Details -->
              <div style="margin:0 0 22px 0;">
                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">
                  📌 Exam Schedule &amp; Details:
                </div>
                <div style="padding-left:4px;color:#334155;font-size:14px;line-height:1.8;">
                  <strong>Course:</strong> ${escapeHtml(courseTitle)} (${escapeHtml(courseCode)})<br>
                  ${faculty ? `<strong>Faculty:</strong> ${escapeHtml(faculty)}<br>` : ""}
                  <strong>Date:</strong> ${escapeHtml(examDateFormatted)}<br>
                  <strong>Time:</strong> <span style="color:#0f766e;font-weight:700;">${escapeHtml(examTimeFormatted)}</span>
                </div>
              </div>

              <!-- Checklist Before Entering the Hall -->
              <div style="margin:0 0 24px 0;">
                <div style="font-size:15px;font-weight:700;color:#0f172a;margin-bottom:8px;">
                  ⚠️ Checklist Before Entering the Hall:
                </div>
                <ul style="margin:0;padding-left:20px;color:#334155;font-size:14px;line-height:1.75;">
                  <li>Student ID Card &amp; Admit Card.</li>
                  <li>Necessary stationery (pens, pencils, ruler).</li>
                  <li>Approved calculator (if permitted for this exam).</li>
                  <li>Arrive at the exam hall at least 20 minutes before start time.</li>
                </ul>
              </div>

              <!-- Encouragement -->
              <p style="margin:0 0 24px 0;color:#0f172a;font-weight:700;font-size:15px;">
                Best of luck! 🎯
              </p>

              <!-- Divider line -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px 0;">

              <!-- Sign-off with clickable ExamMate link -->
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">
                Warm regards,<br>
                <strong style="color:#0f172a;">Team <a href="https://exammate.triizync.com" style="color:#0d9488;text-decoration:none;font-weight:700;" target="_blank">ExamMate</a></strong><br>
                <a href="https://exammate.triizync.com" style="color:#0d9488;text-decoration:none;font-size:13.5px;" target="_blank">https://exammate.triizync.com</a>
              </p>

            </td>
          </tr>
        </table>

        <!-- Outer Dark Footer -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;margin-top:24px;text-align:center;">
          <tr>
            <td style="font-size:12px;color:#94a3b8;line-height:1.6;">
              You're receiving this automated reminder because you synced your exam schedule on <a href="https://exammate.triizync.com" style="color:#5eead4;text-decoration:none;" target="_blank">ExamMate</a>.<br>
              &copy; 2026 ExamMate &middot; Developed by Ahnaf Shahriar Abir.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  try {
    const attachments = hasLocalLogo
      ? [
          {
            filename: "exammate-icon.png",
            path: logoPath,
            cid: "exammate-logo",
          },
        ]
      : [];

    await transporter.sendMail({
      from: `"ExamMate" <${fromAddress}>`,
      to,
      subject,
      text: textBody,
      html: htmlBody,
      attachments,
    });
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email via SMTP.",
    };
  }
}
