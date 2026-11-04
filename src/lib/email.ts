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
  const subject = `ExamMate: Exam Reminder for ${courseTitle} (${courseCode})`;

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
• Arrive at the exam hall at least 15 - 20 minutes before start time.

Wishing you the best of luck for your exam!🎯

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
<body style="margin:0;padding:0;background-color:#0d2630;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer Wrapper with vibrant ExamMate dual-tone gradient (#103b47 to #081e26) -->
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#0d2630" style="background-color:#0d2630;background:linear-gradient(145deg,#11414e 0%,#0c2b36 50%,#071c24 100%);padding:42px 16px;">
    <tr>
      <td align="center">
        
        <!-- Header outside the white card (Centered, clean logo without border + tagline) -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;margin-bottom:24px;text-align:center;">
          <tr>
            <td align="center" style="text-align:center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  ${hasLocalLogo ? `
                  <td valign="middle" style="vertical-align:middle;padding-right:8px;line-height:0;">
                    <img src="cid:exammate-logo" alt="ExamMate Logo" width="22" height="26" style="display:block;border:0;outline:none;width:22px;height:26px;" />
                  </td>
                  ` : ""}
                  <td valign="middle" style="vertical-align:middle;line-height:1;">
                    <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:25px;font-weight:800;letter-spacing:-0.03em;color:#ffffff;line-height:1;display:block;">
                      Exam<span style="color:#5eead4;">Mate</span>
                    </span>
                  </td>
                </tr>
              </table>
              <div style="font-size:13px;color:#99d5cf;margin-top:7px;font-weight:500;letter-spacing:0.02em;">
                Build your exam routine in minutes
              </div>
            </td>
          </tr>
        </table>

        <!-- Center Premium White Card with Boxes -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;background-color:#ffffff;border-radius:18px;border-collapse:separate;box-shadow:0 14px 40px rgba(0,0,0,0.38);overflow:hidden;">
          <tr>
            <td style="padding:36px 32px 32px;color:#1e293b;line-height:1.65;font-size:14.5px;">
              
              <!-- Greeting -->
              <h2 style="margin:0 0 14px 0;color:#0f172a;font-size:18px;font-weight:700;">
                Hello ${escapeHtml(studentName)},
              </h2>
              
              <p style="margin:0 0 20px 0;color:#334155;font-size:14.5px;line-height:1.65;">
                Hope your exam preparation is going smoothly.<br>
                This is a friendly automated reminder from <strong>ExamMate</strong> that you have an upcoming exam scheduled for tomorrow.
              </p>

              <!-- Box 1: Exam Schedule & Details (Light cyan/slate box with teal accent) -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-left:4px solid #0d9488;border-radius:8px;margin-bottom:20px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:14.5px;font-weight:700;color:#0f172a;margin-bottom:8px;">
                      📌 Exam Schedule &amp; Details:
                    </div>
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:13.5px;line-height:1.6;color:#334155;">
                      <tr>
                        <td width="75" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;">Course:</td>
                        <td valign="top" style="font-weight:600;color:#0f172a;padding:3px 0;">${escapeHtml(courseTitle)} (${escapeHtml(courseCode)})</td>
                      </tr>
                      ${faculty ? `
                      <tr>
                        <td width="75" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;">Faculty:</td>
                        <td valign="top" style="color:#334155;padding:3px 0;">${escapeHtml(faculty)}</td>
                      </tr>` : ""}
                      <tr>
                        <td width="75" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;">Date:</td>
                        <td valign="top" style="color:#334155;padding:3px 0;">${escapeHtml(examDateFormatted)}</td>
                      </tr>
                      <tr>
                        <td width="75" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;">Time:</td>
                        <td valign="top" style="color:#0d9488;font-weight:700;padding:3px 0;">${escapeHtml(examTimeFormatted)}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Box 2: Checklist Before Entering the Hall (Soft amber box) -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;margin-bottom:22px;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:14.5px;font-weight:700;color:#92400e;margin-bottom:8px;">
                      ⚠️ Checklist Before Entering the Hall:
                    </div>
                    <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13.5px;line-height:1.7;">
                      <li style="margin-bottom:4px;">Student ID Card &amp; Admit Card.</li>
                      <li style="margin-bottom:4px;">Necessary stationery (pens, pencils, ruler).</li>
                      <li style="margin-bottom:4px;">Approved calculator (if permitted for this exam).</li>
                      <li>Arrive at the exam hall at least 15 - 20 minutes before start time.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Centered Encouragement -->
              <p style="margin:0 0 24px 0;color:#0f172a;font-weight:700;font-size:15px;text-align:center;">
                Wishing you the best of luck for your exam!🎯
              </p>

              <!-- Divider line -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0 16px 0;">

              <!-- Sign-off with direct clickable link on ExamMate -->
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">
                Warm regards,<br>
                <strong style="color:#0f172a;">Team <a href="https://exammate.triizync.com" style="color:#0d9488;text-decoration:none;font-weight:700;" target="_blank">ExamMate</a></strong>
              </p>

            </td>
          </tr>
        </table>

        <!-- Outer Dark Footer with link to ahnafabir.vercel.app -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width:580px;margin-top:24px;text-align:center;">
          <tr>
            <td align="center" style="font-size:12px;color:#99d5cf;line-height:1.6;text-align:center;">
              You're receiving this automated reminder because you synced your exam schedule on ExamMate.<br>
              &copy; 2026 ExamMate &middot; Developed by <a href="https://ahnafabir.vercel.app" style="color:#5eead4;text-decoration:none;font-weight:600;" target="_blank">Ahnaf Shahriar Abir</a>.
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
