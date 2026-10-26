import "server-only";
import { auth } from "@/lib/auth";

export const CALENDAR_EVENT_SCOPES = new Set([
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
]);

export function extractScopeTokens(
  scopes: string[] | string | undefined | null,
): Set<string> {
  const tokens = new Set<string>();
  if (!scopes) return tokens;
  const items = Array.isArray(scopes) ? scopes : [scopes];
  for (const item of items) {
    if (typeof item !== "string") continue;
    for (const part of item.split(/[\s,]+/)) {
      const trimmed = part.trim();
      if (trimmed) tokens.add(trimmed);
    }
  }
  return tokens;
}

export function hasCalendarEventScope(
  scopes: string[] | string | undefined | null,
): boolean {
  const tokens = extractScopeTokens(scopes);
  return (
    tokens.has("https://www.googleapis.com/auth/calendar.events.owned") ||
    tokens.has("https://www.googleapis.com/auth/calendar") ||
    tokens.has("https://www.googleapis.com/auth/calendar.events")
  );
}

export function hasDriveReadScope(
  scopes: string[] | string | undefined | null,
): boolean {
  const tokens = extractScopeTokens(scopes);
  return (
    tokens.has("https://www.googleapis.com/auth/drive.readonly") ||
    tokens.has("https://www.googleapis.com/auth/drive")
  );
}

/** Select the linked Google OAuth account, prioritizing one that satisfies the required scope. */
export function getPrimaryGoogleAccount<
  T extends { providerId: string; scopes?: string[] | string; scope?: string },
>(
  accounts: T[] | null | undefined,
  matcher?: (scopes: string[] | string | undefined) => boolean,
): T | undefined {
  const googleAccounts =
    accounts?.filter((account) => account.providerId === "google") ?? [];
  if (matcher) {
    const matched = googleAccounts.find((account) =>
      matcher(account.scopes ?? account.scope),
    );
    if (matched) return matched;
  }
  return googleAccounts[0];
}

/** Retrieve an active Google access token for the specified account ID using Better-Auth. */
export async function getGoogleAccessToken(
  accountId: string,
  requestHeaders: Headers,
): Promise<string | null> {
  try {
    const token = await auth.api.getAccessToken({
      body: { accountId },
      headers: requestHeaders,
    });
    return token?.accessToken ?? null;
  } catch {
    return null;
  }
}
