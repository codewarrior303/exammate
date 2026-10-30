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

  const textBody = `Reminder from ExamMate: ${courseTitle} (${courseCode})
${examDateFormatted} ⋅ ${examTimeFormatted}

Hello ${studentName},

This is a scheduled automated reminder from ExamMate for your upcoming exam.

📌 EXAM DETAILS:
Course: ${courseTitle} (${courseCode})
${faculty ? `Faculty: ${faculty}\n` : ""}Time: ${examTimeFormatted}
Date: ${examDateFormatted}

⚠️ CRITICAL CHECKLIST (Before entering the hall):
• Student ID & Admit Card
• Pens, Pencils & necessary stationery
• Calculator (If applicable)

💡 Pro Tip: Please try to reach your designated exam venue at least 15–20 minutes early to avoid any last-minute rush.

✨ Wishing you the best of luck with your exam! ✨

🚀 Powered by ExamMate
https://exammate.triizync.com/
`;

  const htmlBody = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e2e8f0;">
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:36px 16px;">
    <tr>
      <td align="center">
        <!-- Main Card in ExamMate Website Deep Navy-Slate Theme (#0e202a to #0a141b) with exact #234645 border -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#0d1b24;background:linear-gradient(180deg,#0e202a 0%,#0a141b 100%);border:1px solid #234645;border-radius:18px;border-collapse:separate;box-shadow:0 12px 40px rgba(0,0,0,0.35);">
          
          <!-- Top Header: Logo + ExamMate Branding perfectly aligned -->
          <tr>
            <td style="padding:22px 28px;border-bottom:1px solid rgba(45,212,191,0.18);background:linear-gradient(180deg,#102633 0%,#0e1e27 100%);border-radius:17px 17px 0 0;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0;padding:0;border-collapse:collapse;">
                <tr>
                  ${hasLocalLogo ? `
                  <td valign="middle" style="vertical-align:middle;padding:0 8px 0 0;line-height:0;">
                    <img src="cid:exammate-logo" alt="ExamMate Logo" width="20" height="24" style="display:block;border:0;outline:none;width:20px;height:24px;" />
                  </td>
                  ` : ""}
                  <td valign="middle" style="vertical-align:middle;padding:0;line-height:1;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:22px;font-weight:800;letter-spacing:-0.03em;color:#ffffff;line-height:1;display:block;margin:0;padding:0;">
                      Exam<span style="color:#5EEAD4;">Mate</span>
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:28px 32px 20px;">
              <h1 style="margin:0 0 8px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:700;color:#ffffff;line-height:1.35;letter-spacing:-0.02em;">
                Reminder: ${escapeHtml(courseTitle)} <span style="color:#5EEAD4;">(${escapeHtml(courseCode)})</span>
              </h1>
              <p style="margin:0 0 20px;font-size:13px;color:#94a3b8;font-weight:500;">
                📅 ${escapeHtml(examDateFormatted)} &nbsp;⋅&nbsp; ⏰ ${escapeHtml(examTimeFormatted)}
              </p>

              <p style="margin:0 0 20px;font-size:14px;color:#cbd5e1;line-height:1.6;">
                Hello <strong>${escapeHtml(studentName)}</strong>,<br>
                This is a scheduled automated reminder from ExamMate for your upcoming exam.
              </p>

              <!-- Exam Details Card -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:rgba(14,28,38,0.85);border:1px solid rgba(45,212,191,0.25);border-radius:12px;margin-bottom:22px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:12px;font-weight:700;color:#5EEAD4;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:10px;">
                      📌 EXAM DETAILS
                    </div>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:13px;line-height:1.6;color:#e2e8f0;">
                      <tr>
                        <td width="80" style="color:#94a3b8;padding:3px 0;">Course:</td>
                        <td style="font-weight:600;color:#ffffff;padding:3px 0;">${escapeHtml(courseTitle)} (${escapeHtml(courseCode)})</td>
                      </tr>
                      ${faculty ? `
                      <tr>
                        <td width="80" style="color:#94a3b8;padding:3px 0;">Faculty:</td>
                        <td style="color:#ffffff;padding:3px 0;">${escapeHtml(faculty)}</td>
                      </tr>` : ""}
                      <tr>
                        <td width="80" style="color:#94a3b8;padding:3px 0;">Time:</td>
                        <td style="color:#5EEAD4;font-weight:600;padding:3px 0;">${escapeHtml(examTimeFormatted)}</td>
                      </tr>
                      <tr>
                        <td width="80" style="color:#94a3b8;padding:3px 0;">Date:</td>
                        <td style="color:#ffffff;padding:3px 0;">${escapeHtml(examDateFormatted)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Critical Checklist -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:rgba(14,28,38,0.85);border:1px solid rgba(45,212,191,0.25);border-radius:12px;margin-bottom:22px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:12px;font-weight:700;color:#fbbf24;letter-spacing:0.05em;text-transform:uppercase;margin-bottom:10px;">
                      ⚠️ CRITICAL CHECKLIST (Before entering the hall)
                    </div>
                    <ul style="margin:0;padding-left:18px;font-size:13px;color:#cbd5e1;line-height:1.7;">
                      <li>Student ID &amp; Admit Card</li>
                      <li>Pens, Pencils &amp; necessary stationery</li>
                      <li>Calculator (If applicable)</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Pro Tip Box -->
              <div style="padding:14px 18px;background-color:rgba(45,212,191,0.08);border-left:3px solid #5EEAD4;border-radius:6px;font-size:13px;color:#94a3b8;line-height:1.55;margin-bottom:22px;">
                💡 <strong style="color:#e2e8f0;">Pro Tip:</strong> Please try to reach your designated exam venue at least 15–20 minutes early to avoid any last-minute rush.
              </div>

              <!-- Celebratory Luck Wish Card -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,rgba(45,212,191,0.12) 0%,rgba(74,222,128,0.08) 100%);border:1px solid rgba(94,234,212,0.28);border-radius:12px;">
                <tr>
                  <td align="center" style="padding:16px 20px;">
                    <span style="font-size:15px;font-weight:700;color:#5EEAD4;letter-spacing:-0.01em;">
                      ✨ Wishing you the best of luck with your exam! ✨
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 32px 24px;border-top:1px solid rgba(255,255,255,0.06);background-color:#081218;text-align:center;border-radius:0 0 17px 17px;">
              <p style="margin:0;font-size:13px;color:#64748b;">
                🚀 Powered by <a href="https://exammate.triizync.com/" style="color:#5EEAD4;text-decoration:none;font-weight:600;" target="_blank">ExamMate</a>
              </p>
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
