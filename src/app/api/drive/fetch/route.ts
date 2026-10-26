import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isTrustedMutationRequest, getClientIp, checkPersistentRateLimit } from "@/lib/api-security";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;
const MAX_REQUEST_BYTES = 2 * 1024;
const UPSTREAM_TIMEOUT_MS = 15_000;

async function readBoundedBody(
  response: Pick<Response, "headers" | "body">,
  limit = MAX_BYTES
): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > limit) {
    await response.body?.cancel();
    throw new Error("File exceeds the allowed size.");
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        throw new Error("File exceeds the allowed size.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function isSafeGoogleUrl(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const host = u.hostname.toLowerCase();
    return (
      (host === "drive.google.com" ||
        host === "docs.google.com" ||
        host === "sheets.google.com" ||
        host === "drive.usercontent.google.com" ||
        host === "googleusercontent.com") &&
      u.protocol === "https:" &&
      u.username === "" &&
      u.password === "" &&
      (u.port === "" || u.port === "443")
    );
  } catch {
    return false;
  }
}

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const COMMON_HEADERS: Record<string, string> = {
  "User-Agent": USER_AGENT,
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,application/octet-stream,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://drive.google.com/",
  "Sec-Ch-Ua": '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

type DriveTarget = {
  id: string;
  isFolder?: boolean;
  isPublishedSheet?: boolean;
  isSpreadsheet?: boolean;
};

function parseDriveLink(raw: string): DriveTarget | null {
  let cleaned = raw.trim();
  if (!cleaned) return null;
  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = `https://${cleaned}`;
  }

  let url: URL;
  try {
    url = new URL(cleaned);
  } catch {
    return null;
  }

  const hostname = url.hostname.toLowerCase();
  if (
    !["drive.google.com", "docs.google.com", "sheets.google.com"].includes(hostname) ||
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    (url.port !== "" && url.port !== "443")
  ) {
    return null;
  }

  // Folder check
  if (url.pathname.includes("/folders/")) {
    const folderMatch = url.pathname.match(/\/folders\/([\w-]{10,})/);
    return { id: folderMatch ? folderMatch[1] : "", isFolder: true };
  }

  // Published sheet: /spreadsheets/.../d/e/2PACX-.../
  const pubMatch = url.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/e\/([\w-]{20,})/);
  if (pubMatch) {
    return { id: pubMatch[1], isPublishedSheet: true, isSpreadsheet: true };
  }

  // Standard Google Sheet: /spreadsheets/.../d/ID/
  const sheetMatch = url.pathname.match(/\/spreadsheets\/(?:u\/\d+\/)?d\/([\w-]{10,})/);
  if (sheetMatch) {
    return { id: sheetMatch[1], isSpreadsheet: true };
  }

  // Drive file: /file/.../d/ID/
  const fileMatch = url.pathname.match(/\/file\/(?:u\/\d+\/)?d\/([\w-]{10,})/);
  if (fileMatch) {
    return { id: fileMatch[1], isSpreadsheet: false };
  }

  // Generic /d/ID/
  const genericMatch = url.pathname.match(/\/d\/([\w-]{10,})/);
  if (genericMatch) {
    return {
      id: genericMatch[1],
      isSpreadsheet: url.pathname.includes("spreadsheets") || hostname === "sheets.google.com",
    };
  }

  // Query parameter: ?id=ID
  const idParam = url.searchParams.get("id");
  if (idParam && /^[\w-]{10,}$/.test(idParam)) {
    return { id: idParam, isSpreadsheet: false };
  }

  return null;
}

function sniffExtension(bytes: Uint8Array): "xlsx" | "xls" | "csv" {
  if (bytes[0] === 0x50 && bytes[1] === 0x4b) return "xlsx";
  if (bytes[0] === 0xd0 && bytes[1] === 0xcf) return "xls";
  return "csv";
}

function isHtmlPayload(bytes: Uint8Array): boolean {
  const prefix = new TextDecoder("utf-8", { fatal: false })
    .decode(bytes.slice(0, 1024))
    .toLowerCase();
  return (
    prefix.includes("<!doctype html") ||
    prefix.includes("<html") ||
    prefix.includes("<head") ||
    prefix.includes("<body") ||
    prefix.includes("<script")
  );
}

function extractHtmlError(html: string, hadLoginRedirect?: boolean): string {
  if (hadLoginRedirect) {
    return "This Drive file needs an authorized Google account with access. Choose the account that can open it, or upload the file directly.";
  }

  const lower = html.toLowerCase();
  if (
    lower.includes("accounts.google.com") ||
    lower.includes("servicelogin") ||
    lower.includes("you need permission") ||
    lower.includes("need access") ||
    lower.includes("request access")
  ) {
    return "This Drive file needs an authorized Google account with access. Choose the account that can open it, or upload the file directly.";
  }

  if (
    lower.includes("file not found") ||
    lower.includes("page not found") ||
    lower.includes("not exist")
  ) {
    return "File not found on Google Drive. Check link or upload file.";
  }

  if (
    lower.includes("download quota") ||
    lower.includes("too many users") ||
    lower.includes("virus scan")
  ) {
    return "Google Drive download limit reached. Please upload directly.";
  }

  return "Could not download file. Check Drive access or upload directly.";
}

async function fetchWithCookieJar(
  initialUrl: string,
  cookieJar: Record<string, Record<string, string>>,
  maxRedirects = 5
): Promise<{ response: Response; finalUrl: string; hitLoginRedirect?: boolean }> {
  let currentUrl = initialUrl;

  for (let i = 0; i < maxRedirects; i++) {
    if (!isSafeGoogleUrl(currentUrl)) {
      throw new Error("Invalid or untrusted download URL target.");
    }

    const currentHost = new URL(currentUrl).hostname.toLowerCase();
    const hostCookies = cookieJar[currentHost] ?? {};
    const cookieHeader = Object.entries(hostCookies)
      .map(([k, v]) => `${k}=${v}`)
      .join("; ");

    const res = await fetch(currentUrl, {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      headers: {
        ...COMMON_HEADERS,
        ...(cookieHeader ? { Cookie: cookieHeader } : {}),
      },
    });

    // Capture cookies
    const rawSetCookies =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [res.headers.get("set-cookie")].filter((v): v is string => Boolean(v));

    for (const cookieStr of rawSetCookies) {
      if (cookieStr) {
        const firstPart = cookieStr.split(";")[0]?.trim();
        if (firstPart) {
          const eqIdx = firstPart.indexOf("=");
          if (eqIdx > 0) {
            const key = firstPart.slice(0, eqIdx).trim();
            const val = firstPart.slice(eqIdx + 1).trim();
            hostCookies[key] = val;
          }
        }
      }
    }
    cookieJar[currentHost] = hostCookies;

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const location = res.headers.get("location");
      if (!location) return { response: res, finalUrl: currentUrl };
      const nextUrl = new URL(location, currentUrl).toString();
      await res.body?.cancel();
      if (!isSafeGoogleUrl(nextUrl)) {
        throw new Error("Redirected to an untrusted domain.");
      }
      const lowerNext = nextUrl.toLowerCase();
      if (lowerNext.includes("accounts.google.com") || lowerNext.includes("servicelogin")) {
        // Redirection to login means endpoint is unauthenticated or restricted
        return { response: res, finalUrl: nextUrl, hitLoginRedirect: true };
      }
      currentUrl = nextUrl;
      continue;
    }

    return { response: res, finalUrl: currentUrl };
  }

  throw new Error("Too many redirects while accessing Google Drive.");
}

function extractDownloadLinkFromHtml(html: string, baseUrl: string): string | null {
  // 1. Direct downloadUrl in script/state
  const jsonMatch = html.match(/"downloadUrl"\s*:\s*"([^"]+)"/i);
  if (jsonMatch && jsonMatch[1]) {
    const raw = jsonMatch[1]
      .replace(/\\u003d/g, "=")
      .replace(/\\u0026/g, "&")
      .replace(/\\\//g, "/")
      .replace(/&amp;/g, "&");
    if (isSafeGoogleUrl(raw)) return raw;
  }

  // 2. Direct drive.usercontent link in href
  const usercontentMatch = html.match(
    /href="([^"]*drive\.usercontent\.google\.com\/download[^"]*)"/i
  );
  if (usercontentMatch && usercontentMatch[1]) {
    const raw = usercontentMatch[1].replace(/&amp;/g, "&");
    if (isSafeGoogleUrl(raw)) return raw;
  }

  // 3. /uc?export=download href
  const ucMatch =
    html.match(/href="(\/uc\?export=download[^"]*)"/i) ||
    html.match(/id="uc-download-link"[^>]*href="([^"]+)"/i);
  if (ucMatch && ucMatch[1]) {
    const full = ucMatch[1].replace(/&amp;/g, "&");
    const parsed = new URL(full, baseUrl).toString();
    if (isSafeGoogleUrl(parsed)) return parsed;
  }

  // 4. Form #download-form
  const formMatch = html.match(/<form[^>]*id="download-form"[^>]*action="([^"]+)"/i);
  if (formMatch && formMatch[1]) {
    const actionUrl = new URL(formMatch[1].replace(/&amp;/g, "&"), baseUrl);
    const inputs = [
      ...html.matchAll(/<input[^>]*type="hidden"[^>]*name="([^"]+)"[^>]*value="([^"]*)"/gi),
    ];
    for (const [, name, val] of inputs) {
      actionUrl.searchParams.set(name, val);
    }
    const finalFormUrl = actionUrl.toString();
    if (isSafeGoogleUrl(finalFormUrl)) return finalFormUrl;
  }

  return null;
}

function extractConfirmToken(
  html: string,
  cookieJar: Record<string, Record<string, string>>,
  fileId: string
): string | null {
  for (const hostCookies of Object.values(cookieJar)) {
    if (hostCookies[`download_warning_${fileId}`]) {
      return hostCookies[`download_warning_${fileId}`];
    }
    if (hostCookies.download_warning) {
      return hostCookies.download_warning;
    }
  }
  const match = html.match(/confirm=([0-9A-Za-z_-]{4,})/i);
  return match ? match[1] : null;
}

async function downloadDriveFile(
  target: DriveTarget
): Promise<{ buffer: Uint8Array; ext: "xlsx" | "xls" | "csv" } | { error: string }> {
  if (target.isFolder) {
    return {
      error: "Please share the file link, not a folder.",
    };
  }

  // 1. Published Google Sheet
  if (target.isPublishedSheet) {
    const pubUrls = [
      `https://docs.google.com/spreadsheets/d/e/${target.id}/pub?output=xlsx`,
      `https://docs.google.com/spreadsheets/d/e/${target.id}/pub?output=csv`,
    ];
    for (const url of pubUrls) {
      try {
        const { response } = await fetchWithCookieJar(url, {});
        if (response.ok) {
          const buf = await readBoundedBody(response);
          if (!isHtmlPayload(buf) && buf.byteLength > 0) {
            return { buffer: buf, ext: sniffExtension(buf) };
          }
        }
      } catch {
        // try next
      }
    }
  }

  // 2. Standard Google Sheet (/spreadsheets/d/ID)
  if (target.isSpreadsheet) {
    const sheetEndpoints = [
      `https://docs.google.com/spreadsheets/d/${target.id}/export?format=xlsx`,
      `https://docs.google.com/spreadsheets/d/${target.id}/gviz/tq?tqx=out:csv`,
      `https://docs.google.com/spreadsheets/d/${target.id}/export?format=csv`,
    ];

    let hadLogin = false;
    for (const endpoint of sheetEndpoints) {
      try {
        const { response, hitLoginRedirect } = await fetchWithCookieJar(endpoint, {});
        if (hitLoginRedirect) {
          hadLogin = true;
          continue;
        }
        if (response.ok) {
          const buf = await readBoundedBody(response);
          if (!isHtmlPayload(buf) && buf.byteLength > 0) {
            return { buffer: buf, ext: sniffExtension(buf) };
          }
        }
      } catch {
        // try next
      }
    }

    if (hadLogin) {
      return {
        error:
          "This Google Sheet is private or restricted to university accounts. Please click Share in Google Drive and set General Access to 'Anyone with the link can view' (Viewer).",
      };
    }
  }

  // 3. Google Drive File downloads (uploaded .xlsx, .xls, .csv, or general files)
  const cookieJar: Record<string, Record<string, string>> = {};
  let lastHtml = "";
  let hadLoginRedirect = false;

  const fileAttempts = [
    `https://docs.google.com/uc?export=download&id=${target.id}`,
    `https://drive.google.com/uc?export=download&id=${target.id}&confirm=t`,
    `https://drive.usercontent.google.com/download?id=${target.id}&export=download&authuser=0&confirm=t`,
  ];

  for (const url of fileAttempts) {
    try {
      const { response, finalUrl, hitLoginRedirect } = await fetchWithCookieJar(url, cookieJar);
      if (hitLoginRedirect) {
        hadLoginRedirect = true;
        continue;
      }

      const buf = await readBoundedBody(response);
      if (response.ok && !isHtmlPayload(buf) && buf.byteLength > 0) {
        return { buffer: buf, ext: sniffExtension(buf) };
      }

      if (buf.byteLength > 0) {
        const html = new TextDecoder().decode(buf);
        lastHtml = html;

        // Check if there is an extracted direct download link or confirmation form
        const extractedUrl = extractDownloadLinkFromHtml(html, finalUrl);
        if (extractedUrl) {
          const confirmed = await fetchWithCookieJar(extractedUrl, cookieJar);
          const confBuf = await readBoundedBody(confirmed.response);
          if (confirmed.response.ok && !isHtmlPayload(confBuf) && confBuf.byteLength > 0) {
            return { buffer: confBuf, ext: sniffExtension(confBuf) };
          }
        }

        // Check if there is a confirm token
        const token = extractConfirmToken(html, cookieJar, target.id);
        if (token) {
          const retryWithToken = `https://drive.google.com/uc?export=download&id=${target.id}&confirm=${token}`;
          const tokenRes = await fetchWithCookieJar(retryWithToken, cookieJar);
          const tokenBuf = await readBoundedBody(tokenRes.response);
          if (tokenRes.response.ok && !isHtmlPayload(tokenBuf) && tokenBuf.byteLength > 0) {
            return { buffer: tokenBuf, ext: sniffExtension(tokenBuf) };
          }
        }
      }
    } catch {
      // try next
    }
  }

  // 4. Try fetching the file's view preview page (drive.google.com/file/d/ID/view) to find the downloadUrl
  try {
    const viewUrl = `https://drive.google.com/file/d/${target.id}/view`;
    const { response, finalUrl, hitLoginRedirect } = await fetchWithCookieJar(viewUrl, cookieJar);
    if (hitLoginRedirect) {
      hadLoginRedirect = true;
    } else {
      const buf = await readBoundedBody(response);
      const html = new TextDecoder().decode(buf);
      if (html) {
        lastHtml = html;
        const extractedUrl = extractDownloadLinkFromHtml(html, finalUrl);
        if (extractedUrl) {
          const dlRes = await fetchWithCookieJar(extractedUrl, cookieJar);
          const dlBuf = await readBoundedBody(dlRes.response);
          if (dlRes.response.ok && !isHtmlPayload(dlBuf) && dlBuf.byteLength > 0) {
            return { buffer: dlBuf, ext: sniffExtension(dlBuf) };
          }
        }
      }
    }
  } catch {
    // try fallback
  }

  // 5. Fallback: In case the file was converted or opened in Google Sheets
  if (!target.isSpreadsheet) {
    try {
      const gvizUrl = `https://docs.google.com/spreadsheets/d/${target.id}/gviz/tq?tqx=out:csv`;
      const { response, hitLoginRedirect } = await fetchWithCookieJar(gvizUrl, {});
      if (!hitLoginRedirect && response.ok) {
        const buf = await readBoundedBody(response);
        if (!isHtmlPayload(buf) && buf.byteLength > 0) {
          return { buffer: buf, ext: "csv" };
        }
      }
    } catch {
      // ignore
    }
  }

  return {
    error: extractHtmlError(lastHtml, hadLoginRedirect),
  };
}

async function downloadWithGoogleDriveApi(
  fileId: string,
  accessToken: string,
): Promise<{ buffer: Uint8Array; ext: "xlsx" | "xls" | "csv" } | null> {
  const metadataResponse = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=mimeType,size&supportsAllDrives=true`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      cache: "no-store",
    },
  );
  if (!metadataResponse.ok) {
    await metadataResponse.body?.cancel();
    return null;
  }

  const metadata = await metadataResponse.json().catch(() => null) as
    | { mimeType?: string; size?: string }
    | null;
  if (!metadata?.mimeType) return null;
  const declaredSize = Number(metadata.size);
  if (Number.isFinite(declaredSize) && declaredSize > MAX_BYTES) {
    throw new Error("File exceeds the 15 MB limit.");
  }

  const isNativeSheet = metadata.mimeType === "application/vnd.google-apps.spreadsheet";
  const endpoint = isNativeSheet
    ? `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
    : `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`;
  const response = await fetch(endpoint, {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    cache: "no-store",
  });
  if (!response.ok) {
    await response.body?.cancel();
    return null;
  }
  const buffer = await readBoundedBody(response);
  if (!buffer.byteLength || isHtmlPayload(buffer)) return null;
  return { buffer, ext: isNativeSheet ? "xlsx" : sniffExtension(buffer) };
}

function hasDriveReadScope(scopes: string[] | undefined): boolean {
  return Boolean(scopes?.includes("https://www.googleapis.com/auth/drive.readonly"));
}

export async function GET() {
  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    const accounts = session
      ? await auth.api.listUserAccounts({ headers: requestHeaders })
      : [];
    const account = accounts?.find((item) => item.providerId === "google");
    return NextResponse.json(
      { connected: Boolean(session && account), hasDriveScope: hasDriveReadScope(account?.scopes) },
      { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
    );
  } catch {
    return NextResponse.json(
      { connected: false, hasDriveScope: false },
      { headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } },
    );
  }
}

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) {
    return NextResponse.json({ error: "Expected a JSON request." }, { status: 415 });
  }
  if (!request.body) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const clientIp = getClientIp(request);
  let rateLimit;
  try {
    rateLimit = await checkPersistentRateLimit(`drive_fetch:${clientIp}`, 20, 60 * 1000);
  } catch {
    return NextResponse.json({ error: "Service temporarily unavailable." }, { status: 503 });
  }
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment." },
      { status: 429 }
    );
  }

  let link = "";
  try {
    const bodyText = new TextDecoder().decode(await readBoundedBody(request, MAX_REQUEST_BYTES));
    const body = JSON.parse(bodyText) as { url?: unknown };
    link = typeof body.url === "string" ? body.url.trim() : "";
  } catch (error) {
    if (error instanceof Error && error.message === "File exceeds the allowed size.") {
      return NextResponse.json({ error: "Request is too large." }, { status: 413 });
    }
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  if (!link) {
    return NextResponse.json({ error: "Please enter a Google Drive link." }, { status: 400 });
  }

  const target = parseDriveLink(link);
  if (!target) {
    return NextResponse.json(
      {
        error: "Invalid Drive link. Please enter a valid file link.",
      },
      { status: 400 }
    );
  }
  if (target.isFolder || !target.id) {
    return NextResponse.json(
      { error: "Paste a single Google Drive file or spreadsheet link, not a folder link." },
      { status: 400, headers: { "Cache-Control": "private, no-store" } },
    );
  }

  // Read only the single file ID parsed from a Google Drive URL. OAuth tokens
  // stay server-side and are never sent to the pasted URL or its redirects.
  try {
    let session: Awaited<ReturnType<typeof auth.api.getSession>> = null;
    let googleAccount: Awaited<ReturnType<typeof auth.api.listUserAccounts>>[number] | undefined;
    let requestHeaders: Headers | undefined;
    try {
      requestHeaders = await headers();
      session = await auth.api.getSession({ headers: requestHeaders });
      if (session) {
        const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
        googleAccount = accounts?.find((account) => account.providerId === "google");
      }
    } catch {
      // Public shared links remain available if optional sign-in is unavailable.
    }

    if (session && googleAccount && hasDriveReadScope(googleAccount.scopes)) {
      try {
        const token = await auth.api.getAccessToken({
          body: { accountId: googleAccount.id },
          headers: requestHeaders!,
        });
        if (token?.accessToken) {
          const privateResult = await downloadWithGoogleDriveApi(target.id, token.accessToken);
          if (privateResult) {
            return new Response(privateResult.buffer as unknown as BodyInit, {
              headers: {
                "Content-Type": "application/octet-stream",
                "X-File-Name": `drive-routine.${privateResult.ext}`,
                "Cache-Control": "private, no-store",
                "Vary": "Cookie",
                "X-Content-Type-Options": "nosniff",
              },
            });
          }
        }
      } catch {
        // Do not expose provider errors, file IDs, or access tokens to the client/logs.
      }
    }

    const result = await downloadDriveFile(target);
    if ("error" in result) {
      return NextResponse.json(
        {
          error: result.error,
          requiresGoogleAuth: !session || !googleAccount || !hasDriveReadScope(googleAccount.scopes),
        },
        { status: 422 }
      );
    }

    if (result.buffer.byteLength === 0 || result.buffer.byteLength > MAX_BYTES) {
      return NextResponse.json(
        { error: "File is empty or exceeds 15 MB." },
        { status: 413 }
      );
    }

    return new Response(result.buffer as unknown as BodyInit, {
      headers: {
        "Content-Type": "application/octet-stream",
        "X-File-Name": `drive-routine.${result.ext}`,
        "Cache-Control": "private, no-store",
        "Vary": "Cookie",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Could not connect to Google Drive. Check your connection.",
      },
      { status: 502 }
    );
  }
}
