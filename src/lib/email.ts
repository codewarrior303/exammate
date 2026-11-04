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

  const textBody = `ExamMate: Exam Reminder for ${courseTitle} (${courseCode})
${examDateFormatted} ⋅ ${examTimeFormatted}

Hello ${studentName},

Hope your exam preparation is going well. This is a scheduled reminder from ExamMate to help you stay ahead, organized, and on time for your upcoming final exam.

📌 EXAM SCHEDULE & DETAILS:
• Course: ${courseTitle} (${courseCode})
${faculty ? `• Faculty: ${faculty}\n` : ""}• Date: ${examDateFormatted}
• Time: ${examTimeFormatted}

⚠️ CHECKLIST BEFORE ENTERING THE HALL:
• Make sure you have your Student ID Card and Admit Card.
• Keep necessary stationery (pens, pencils, ruler, eraser) organized.
• Approved scientific calculator (if applicable for this exam).
• Arrive at the exam center at least 20–25 minutes early to avoid unexpected delays.

Wishing you the very best of luck for your exam! Stay calm and give it your best shot! 🎯

Warm regards,
Team ExamMate
https://exammate.triizync.com/
`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#0b171e;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer Wrapper with signature dark background (#0b171e) -->
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#0b171e;padding:40px 16px;">
    <tr>
      <td align="center">
        
        <!-- Header outside the white card (Programming Hero style) -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;margin-bottom:24px;text-align:center;">
          <tr>
            <td align="center">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  ${hasLocalLogo ? `
                  <td valign="middle" style="vertical-align:middle;padding-right:8px;line-height:0;">
                    <img src="cid:exammate-logo" alt="ExamMate Logo" width="22" height="26" style="display:block;border:0;outline:none;width:22px;height:26px;" />
                  </td>
                  ` : ""}
                  <td valign="middle" style="vertical-align:middle;line-height:1;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:24px;font-weight:800;letter-spacing:-0.03em;color:#ffffff;">
                      Exam<span style="color:#2dd4bf;">Mate</span>
                    </span>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px;color:#94a3b8;margin-top:6px;font-weight:400;letter-spacing:0.02em;">
                Your Smart Exam Companion
              </div>
            </td>
          </tr>
        </table>

        <!-- Center Premium White Card (#ffffff) -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:18px;border-collapse:separate;box-shadow:0 12px 36px rgba(0,0,0,0.35);overflow:hidden;">
          <tr>
            <td style="padding:36px 32px 32px;color:#1e293b;line-height:1.65;font-size:14.5px;">
              
              <!-- Greeting -->
              <h2 style="margin:0 0 16px 0;color:#0f172a;font-size:20px;font-weight:700;letter-spacing:-0.02em;">
                Hello ${escapeHtml(studentName)},
              </h2>
              
              <p style="margin:0 0 22px 0;color:#475569;font-size:14.5px;line-height:1.65;">
                Hope your exam preparation is going well. This is a scheduled reminder from <strong style="color:#0f172a;">ExamMate</strong> to help you stay ahead, organized, and on time for your upcoming final exam.
              </p>

              <!-- Exam Details Box -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-left:4px solid #0d9488;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:14.5px;font-weight:700;color:#0f172a;margin-bottom:10px;">
                      📌 Exam Schedule &amp; Details:
                    </div>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:13.5px;line-height:1.6;color:#334155;">
                      <tr>
                        <td width="85" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;">Course:</td>
                        <td valign="top" style="font-weight:600;color:#0f172a;padding:3px 0;">${escapeHtml(courseTitle)} (${escapeHtml(courseCode)})</td>
                      </tr>
                      ${faculty ? `
                      <tr>
                        <td width="85" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;">Faculty:</td>
                        <td valign="top" style="color:#334155;padding:3px 0;">${escapeHtml(faculty)}</td>
                      </tr>` : ""}
                      <tr>
                        <td width="85" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;">Date:</td>
                        <td valign="top" style="color:#334155;padding:3px 0;">${escapeHtml(examDateFormatted)}</td>
                      </tr>
                      <tr>
                        <td width="85" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;">Time:</td>
                        <td valign="top" style="color:#0d9488;font-weight:700;padding:3px 0;">${escapeHtml(examTimeFormatted)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Critical Checklist Box -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:14.5px;font-weight:700;color:#92400e;margin-bottom:8px;">
                      ⚠️ Checklist Before Entering the Hall:
                    </div>
                    <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13.5px;line-height:1.7;">
                      <li style="margin-bottom:4px;">Make sure you have your <strong>Student ID Card</strong> and <strong>Admit Card</strong>.</li>
                      <li style="margin-bottom:4px;">Keep necessary stationery (pens, pencils, ruler, eraser) organized.</li>
                      <li style="margin-bottom:4px;">Approved scientific calculator (if applicable for this exam).</li>
                      <li>Arrive at the exam center at least <strong>20–25 minutes early</strong> to avoid unexpected delays.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Encouraging Closing Note -->
              <p style="margin:0 0 24px 0;color:#0f172a;font-weight:600;font-size:14.5px;line-height:1.6;">
                Wishing you the very best of luck for your exam! Stay calm and give it your best shot! 🎯
              </p>

              <!-- Sign-off -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="border-top:1px solid #e2e8f0;padding-top:20px;">
                <tr>
                  <td style="font-size:13.5px;color:#64748b;line-height:1.6;">
                    Warm regards,<br>
                    <strong style="color:#0f172a;font-size:14.5px;">Team ExamMate</strong><br>
                    <a href="https://exammate.triizync.com" style="color:#0d9488;text-decoration:none;font-weight:500;" target="_blank">exammate.triizync.com</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>

        <!-- Outer Dark Footer -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;margin-top:24px;text-align:center;">
          <tr>
            <td style="font-size:12px;color:#94a3b8;line-height:1.6;">
              You're receiving this automated reminder because you synced your exam schedule on ExamMate.<br>
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
