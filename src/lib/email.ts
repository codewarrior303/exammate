import nodemailer, { type Transporter } from "nodemailer";

export interface ExamReminderItem {
  courseCode: string;
  courseTitle: string;
  faculty?: string;
  examDateFormatted: string;
  examTimeFormatted: string;
}

export interface ExamReminderEmailParams {
  to: string;
  studentName: string;
  exams?: ExamReminderItem[];
  courseCode?: string;
  courseTitle?: string;
  faculty?: string;
  examDateFormatted?: string;
  examTimeFormatted?: string;
}

export type EmailProviderName = "gmail" | "brevo" | "fallback";

interface ConfiguredTransporter {
  name: EmailProviderName;
  transporter: Transporter;
  senderAddress: string;
}

const exhaustedProviders = new Set<EmailProviderName>();

export function resetProviderExhaustion(): void {
  exhaustedProviders.clear();
}

function getTransporters(): ConfiguredTransporter[] {
  const list: ConfiguredTransporter[] = [];

  // 1. Primary: Gmail SMTP (up to 500 emails/day)
  const gmailUser = process.env.EMAIL_USER;
  const gmailPass = process.env.EMAIL_PASS;
  if (gmailUser && gmailPass) {
    list.push({
      name: "gmail",
      senderAddress: gmailUser,
      transporter: nodemailer.createTransport({
        service: "gmail",
        auth: { user: gmailUser, pass: gmailPass },
      }),
    });
  }

  // 2. Secondary: Brevo SMTP (up to 300 emails/day)
  const brevoPass =
    process.env.BREVO_PASS ||
    process.env.BREVO_API_KEY ||
    process.env.BREVO_SMTP_KEY;
  const brevoUser = process.env.BREVO_USER || gmailUser;
  if (brevoUser && brevoPass) {
    list.push({
      name: "brevo",
      senderAddress: gmailUser || brevoUser,
      transporter: nodemailer.createTransport({
        host: "smtp-relay.brevo.com",
        port: 587,
        secure: false,
        auth: { user: brevoUser, pass: brevoPass },
      }),
    });
  }

  // 3. Tertiary: Fallback SMTP (Resend / AWS SES / Custom SMTP for 800+ scaling)
  const fallbackHost =
    process.env.FALLBACK_SMTP_HOST ||
    (process.env.RESEND_API_KEY ? "smtp.resend.com" : "");
  const fallbackPass =
    process.env.FALLBACK_SMTP_PASS || process.env.RESEND_API_KEY;
  const fallbackUser =
    process.env.FALLBACK_SMTP_USER ||
    (process.env.RESEND_API_KEY ? "resend" : "");
  if (fallbackHost && fallbackPass) {
    list.push({
      name: "fallback",
      senderAddress:
        process.env.FALLBACK_FROM_ADDRESS ||
        gmailUser ||
        "notifications@exammate.triizync.com",
      transporter: nodemailer.createTransport({
        host: fallbackHost,
        port: Number(process.env.FALLBACK_SMTP_PORT) || 587,
        secure: process.env.FALLBACK_SMTP_PORT === "465",
        auth: { user: fallbackUser, pass: fallbackPass },
      }),
    });
  }

  return list;
}

function isQuotaExhaustedError(errMessage: string): boolean {
  const m = errMessage.toLowerCase();
  return (
    m.includes("daily sending quota exceeded") ||
    m.includes("daily user sending limit exceeded") ||
    m.includes("550 5.4.5") ||
    m.includes("550-5.7.1") ||
    m.includes("rate limit") ||
    m.includes("quota") ||
    m.includes("too many") ||
    m.includes("limit exceeded") ||
    m.includes("account suspended")
  );
}

function escapeHtml(text: string): string {
  return text.replace(
    /[&<>"']/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[char] ?? char,
  );
}

function injectAntiTrimEntropy(text: string): string {
  const zeroWidthChars = ["&zwnj;", "&#8203;"];
  const words = text.split(" ");
  return words
    .map((word) => {
      if (word.length > 3 && Math.random() > 0.3) {
        const splitIndex = Math.floor(word.length / 2);
        const char =
          zeroWidthChars[Math.floor(Math.random() * zeroWidthChars.length)];
        return word.slice(0, splitIndex) + char + word.slice(splitIndex);
      }
      return word;
    })
    .join(" ");
}

export async function sendExamReminderEmail(
  params: ExamReminderEmailParams,
): Promise<{
  success: boolean;
  provider?: EmailProviderName;
  error?: string;
  allExhausted?: boolean;
}> {
  const transporters = getTransporters();
  if (!transporters.length) {
    return {
      success: false,
      error: "No email credentials configured. Please set EMAIL_USER/EMAIL_PASS or BREVO credentials.",
    };
  }

  const availableTransporters = transporters.filter(
    (t) => !exhaustedProviders.has(t.name),
  );

  if (!availableTransporters.length) {
    return {
      success: false,
      error: "ALL_PROVIDERS_EXHAUSTED",
      allExhausted: true,
    };
  }

  const { to, studentName } = params;
  const rawExams: ExamReminderItem[] =
    params.exams && params.exams.length > 0
      ? params.exams
      : [
          {
            courseCode: params.courseCode ?? "",
            courseTitle: params.courseTitle ?? "",
            faculty: params.faculty,
            examDateFormatted: params.examDateFormatted ?? "",
            examTimeFormatted: params.examTimeFormatted ?? "",
          },
        ];

  const exams = rawExams.filter((e) => e.courseCode || e.courseTitle);
  const isMultiple = exams.length > 1;

  let subject: string;
  if (!isMultiple) {
    const single = exams[0] ?? { courseTitle: "Exam", courseCode: "" };
    subject = `ExamMate Reminder: ${single.courseTitle} (${single.courseCode})`;
  } else {
    const codes = exams.map((e) => e.courseCode);
    const formattedCodes =
      codes.length === 2
        ? `${codes[0]} & ${codes[1]}`
        : `${codes.slice(0, -1).join(", ")} & ${codes[codes.length - 1]}`;
    subject = `ExamMate Reminder: ${formattedCodes} (${exams.length} Exams Tomorrow)`;
  }

  const fromAddress = process.env.EMAIL_USER;
  const currentYear = new Date().getFullYear();
  const antiTrimToken = `\u200C<!-- ${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)} -->`;
  const footerDisclaimer = injectAntiTrimEntropy(
    "You're receiving this automated reminder because you synced your exam schedule on ExamMate.",
  );

  const introTextHtml = isMultiple
    ? `Hope your preparation is going well!<br>This is a quick reminder from <strong>ExamMate</strong> that you have ${exams.length} upcoming exams tomorrow.`
    : `Hope your preparation is going well!<br>This is a quick reminder from <strong>ExamMate</strong> that you have an upcoming exam tomorrow.`;

  const introTextPlain = isMultiple
    ? `Hope your preparation is going well!\nThis is a quick reminder from ExamMate that you have ${exams.length} upcoming exams tomorrow.`
    : `Hope your preparation is going well!\nThis is a quick reminder from ExamMate that you have an upcoming exam tomorrow.`;

  const textExams = exams
    .map((exam, index) => {
      const prefix = isMultiple ? `Exam ${index + 1}:\n\n` : "";
      return `${prefix}Course: ${exam.courseTitle} (${exam.courseCode})\n${exam.faculty ? `Faculty: ${exam.faculty}\n` : ""}Date: ${exam.examDateFormatted}\nTime: ${exam.examTimeFormatted}`;
    })
    .join("\n\n──────────────────────────────────────────\n\n");

  const textBody = `Hello ${studentName},

${introTextPlain}

📌 Exam Schedule & Details:
${textExams}

⚠️ Checklist Before Entering the Hall:
• Student ID Card & Admit Card.
• Necessary stationery (pens, pencils, ruler).
• Approved calculator (if permitted for this exam).
• Arrive at the exam hall at least 15 - 20 minutes before start time.

Wishing you the best of luck for your ${isMultiple ? "exams" : "exam"}!🎯

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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style type="text/css">
    @import url('https://fonts.googleapis.com/css2?family=Jost:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap');
    .font-jakarta {
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
    .font-jost {
      font-family: 'Jost', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif !important;
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#0d2630;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <!-- Outer Wrapper with vibrant ExamMate dual-tone gradient (#103b47 to #081e26) -->
  <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" bgcolor="#0d2630" style="background-color:#0d2630;background:linear-gradient(145deg,#11414e 0%,#0c2b36 50%,#071c24 100%);padding:42px 16px;">
    <tr>
      <td align="center">
        
        <!-- Header outside the white card (Centered, clean logo without border + tagline, font: Plus Jakarta Sans) -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="font-jakarta" style="max-width:580px;margin-bottom:24px;text-align:center;font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td align="center" style="text-align:center;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td valign="middle" style="vertical-align:middle;padding-right:8px;line-height:0;">
                    <img src="https://exammate.triizync.com/icons/email-logo.png" alt="ExamMate Logo" width="22" height="26" style="display:block;border:0;outline:none;width:22px;height:26px;" />
                  </td>
                  <td valign="middle" style="vertical-align:middle;line-height:1;">
                    <span class="font-jakarta" style="font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:25px;font-weight:800;letter-spacing:-0.03em;color:#ffffff;line-height:1;display:block;">
                      Exam<span style="color:#5eead4;">Mate</span>
                    </span>
                  </td>
                </tr>
              </table>
              <div class="font-jakarta" style="font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:13px;color:#99d5cf;margin-top:7px;font-weight:500;letter-spacing:0.02em;">
                Build your exam routine in minutes
              </div>
            </td>
          </tr>
        </table>

        <!-- Center Premium White Card with Boxes (font: Jost) -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="font-jost" style="max-width:580px;background-color:#ffffff;border-radius:18px;border-collapse:separate;box-shadow:0 14px 40px rgba(0,0,0,0.38);overflow:hidden;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td class="font-jost" style="font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;padding:36px 32px 32px;color:#1e293b;line-height:1.65;font-size:14.5px;">
              
              <!-- Greeting -->
              <h2 style="margin:0 0 14px 0;color:#0f172a;font-size:18px;font-weight:700;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                Hello ${escapeHtml(studentName)},
              </h2>
              
              <p style="margin:0 0 20px 0;color:#334155;font-size:14.5px;line-height:1.65;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                ${introTextHtml}
              </p>

              <!-- Box 1: Exam Schedule & Details (Light cyan/slate box with teal accent) -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;border-left:4px solid #0d9488;border-radius:8px;margin-bottom:20px;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:14.5px;font-weight:700;color:#0f172a;margin-bottom:10px;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                      📌 Exam Schedule &amp; Details:
                    </div>
                    ${exams
                      .map(
                        (exam, index) => `
                    ${
                      isMultiple
                        ? `<div style="font-size:13.5px;font-weight:700;color:#0d9488;margin:${index > 0 ? "14px" : "4px"} 0 8px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                      Exam ${index + 1}:
                    </div>`
                        : ""
                    }
                    <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="font-size:13.5px;line-height:1.6;color:#334155;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                      <tr>
                        <td width="75" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Course:</td>
                        <td valign="top" style="font-weight:600;color:#0f172a;padding:3px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(exam.courseTitle)} (${escapeHtml(exam.courseCode)})</td>
                      </tr>
                      ${
                        exam.faculty
                          ? `
                      <tr>
                        <td width="75" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Faculty:</td>
                        <td valign="top" style="color:#334155;padding:3px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(exam.faculty)}</td>
                      </tr>`
                          : ""
                      }
                      <tr>
                        <td width="75" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Date:</td>
                        <td valign="top" style="color:#334155;padding:3px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(exam.examDateFormatted)}</td>
                      </tr>
                      <tr>
                        <td width="75" valign="top" style="color:#64748b;font-weight:600;padding:3px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">Time:</td>
                        <td valign="top" style="color:#0d9488;font-weight:700;padding:3px 0;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">${escapeHtml(exam.examTimeFormatted)}</td>
                      </tr>
                    </table>
                    ${
                      isMultiple && index < exams.length - 1
                        ? `<hr style="border:none;border-top:1px dashed #cbd5e1;margin:14px 0;">`
                        : ""
                    }`,
                      )
                      .join("")}
                  </td>
                </tr>
              </table>

              <!-- Box 2: Checklist Before Entering the Hall (Soft amber box) -->
              <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color:#fffbeb;border-left:4px solid #f59e0b;border-radius:8px;margin-bottom:22px;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                <tr>
                  <td style="padding:16px 20px;">
                    <div style="font-size:14.5px;font-weight:700;color:#92400e;margin-bottom:8px;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                      ⚠️ Checklist Before Entering the Hall:
                    </div>
                    <ul style="margin:0;padding-left:18px;color:#78350f;font-size:13.5px;line-height:1.7;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                      <li style="margin-bottom:4px;">Student ID Card &amp; Admit Card.</li>
                      <li style="margin-bottom:4px;">Necessary stationery (pens, pencils, ruler).</li>
                      <li style="margin-bottom:4px;">Approved calculator (if permitted for this exam).</li>
                      <li>Arrive at the exam hall at least 15 - 20 minutes before start time.</li>
                    </ul>
                  </td>
                </tr>
              </table>

              <!-- Centered Encouragement -->
              <p style="margin:0 0 24px 0;color:#0f172a;font-weight:700;font-size:15px;text-align:center;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                Wishing you the best of luck for your ${isMultiple ? "exams" : "exam"}!🎯
              </p>

              <!-- Divider line -->
              <hr style="border:none;border-top:1px solid #e2e8f0;margin:22px 0 16px 0;">

              <!-- Sign-off with direct clickable link on ExamMate -->
              <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;font-family:'Jost',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
                Warm&zwnj; regards,<br>
                <strong style="color:#0f172a;">Team <a href="https://exammate.triizync.com" style="color:#0d9488;text-decoration:none;font-weight:700;" target="_blank">ExamMate</a></strong>
              </p>

            </td>
          </tr>
        </table>

        <!-- Outer Dark Footer with link to ahnafabir.vercel.app (font: Plus Jakarta Sans) -->
        <table role="presentation" width="100%" border="0" cellpadding="0" cellspacing="0" class="font-jakarta" style="max-width:580px;margin-top:24px;text-align:center;font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <tr>
            <td align="center" class="font-jakarta" style="font-size:12px;color:#99d5cf;line-height:1.6;text-align:center;font-family:'Plus Jakarta Sans',system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
              <span style="opacity:0;font-size:0;line-height:0;height:0;display:inline-block;overflow:hidden;mso-hide:all;">${antiTrimToken}</span>
              ${footerDisclaimer}<br>
              &copy; ${currentYear} ExamMate &middot; Developed by <a href="https://ahnafabir.vercel.app" style="color:#5eead4;text-decoration:none;font-weight:600;" target="_blank">Ahnaf Shahriar Abir</a>.
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`;

  let lastError = "";

  for (const item of availableTransporters) {
    try {
      const fromAddress = item.senderAddress;
      const replyToAddress = process.env.EMAIL_USER || "exammate.support@gmail.com";
      await item.transporter.sendMail({
        from: `"ExamMate" <${fromAddress}>`,
        replyTo: `"ExamMate" <${replyToAddress}>`,
        to,
        subject,
        text: textBody,
        html: htmlBody,
        headers: {
          "X-Entity-Ref-ID": `exammate-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        },
      });
      return { success: true, provider: item.name };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      lastError = msg;
      if (isQuotaExhaustedError(msg)) {
        console.warn(
          `[Email Provider] ${item.name} hit daily sending quota. Switching to fallback provider.`,
        );
        exhaustedProviders.add(item.name);
      } else {
        console.warn(
          `[Email Provider] ${item.name} failed (${msg}). Trying fallback provider.`,
        );
      }
    }
  }

  const allExhausted = transporters.every((t) => exhaustedProviders.has(t.name));
  return {
    success: false,
    error: allExhausted
      ? "ALL_PROVIDERS_EXHAUSTED"
      : lastError || "Failed to send email via available SMTP providers.",
    allExhausted,
  };
}
