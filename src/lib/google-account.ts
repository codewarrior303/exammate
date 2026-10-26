import "server-only";
import { auth } from "@/lib/auth";

export const CALENDAR_EVENT_SCOPES = new Set([
  "https://www.googleapis.com/auth/calendar.events.owned",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
]);

export function hasCalendarEventScope(scopes: string[] | undefined): boolean {
  return Boolean(scopes?.some((scope) => CALENDAR_EVENT_SCOPES.has(scope)));
}

export function hasDriveReadScope(scopes: string[] | undefined): boolean {
  return Boolean(
    scopes?.some(
      (scope) =>
        scope === "https://www.googleapis.com/auth/drive.readonly" ||
        scope === "https://www.googleapis.com/auth/drive",
    ),
  );
}

/** Select the linked Google OAuth account, prioritizing one that satisfies the required scope. */
export function getPrimaryGoogleAccount<
  T extends { providerId: string; scopes?: string[] },
>(
  accounts: T[] | null | undefined,
  matcher?: (scopes: string[] | undefined) => boolean,
): T | undefined {
  const googleAccounts =
    accounts?.filter((account) => account.providerId === "google") ?? [];
  if (matcher) {
    const matched = googleAccounts.find((account) => matcher(account.scopes));
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
