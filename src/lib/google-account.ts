import "server-only";
import { auth, getAuthDatabase } from "@/lib/auth";

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

/**
 * Accurately resolve and verify a user's Google account and scopes.
 *
 * Better-Auth intentionally omits the `scope` update on standard `signIn.social` calls for
 * already-registered users, which can leave the database record out of sync after a scope
 * elevation (e.g. adding Calendar access).
 *
 * This function queries MongoDB directly and, if the calendar scope is still missing from DB
 * but an access token is available, queries Google's official `/tokeninfo` endpoint live to
 * detect newly granted permissions. When verified, it merges and persists the scopes to MongoDB
 * so subsequent checks are immediate.
 */
export async function getVerifiedGoogleAccount(
  userId: string,
  requestHeaders: Headers,
): Promise<{
  googleAccount: { id: string; providerId: string; scopes?: string[]; scope?: string } | null;
  hasCalendarScope: boolean;
  hasDriveScope: boolean;
  accessToken: string | null;
}> {
  let accounts: Array<{ id: string; providerId: string; scopes?: string[]; scope?: string }> = [];
  try {
    const list = await auth.api.listUserAccounts({ headers: requestHeaders });
    if (list) accounts = list;
  } catch {
    // ignore
  }

  const googleAccounts = accounts.filter((a) => a.providerId === "google");
  let primary = googleAccounts[0] ?? null;

  let hasCalendar = googleAccounts.some((a) =>
    hasCalendarEventScope(a.scopes ?? a.scope),
  );
  let hasDrive = googleAccounts.some((a) =>
    hasDriveReadScope(a.scopes ?? a.scope),
  );

  // If already confirmed through Better-Auth, retrieve the token and return
  if (hasCalendar && hasDrive && primary) {
    const token = await getGoogleAccessToken(primary.id, requestHeaders);
    return {
      googleAccount: primary,
      hasCalendarScope: true,
      hasDriveScope: true,
      accessToken: token,
    };
  }

  // Check MongoDB directly to handle cases where Better-Auth stripped scope from listUserAccounts
  try {
    const db = await getAuthDatabase();
    const accountDoc = await db.collection("account").findOne({
      userId,
      providerId: "google",
    });

    if (accountDoc) {
      if (!primary) {
        primary = {
          id: (accountDoc.id || accountDoc._id.toString()) as string,
          providerId: "google",
          scope: accountDoc.scope as string,
        };
      }

      const dbScope = (accountDoc.scope as string) || "";
      if (!hasCalendar && hasCalendarEventScope(dbScope)) {
        hasCalendar = true;
      }
      if (!hasDrive && hasDriveReadScope(dbScope)) {
        hasDrive = true;
      }

      let accessToken: string | null = null;
      if (primary?.id) {
        accessToken = await getGoogleAccessToken(primary.id, requestHeaders);
      }

      // If calendar scope is still unconfirmed, verify live token permissions with Google OAuth2 tokeninfo
      if (accessToken && (!hasCalendar || !hasDrive)) {
        try {
          const res = await fetch(
            `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`,
            { cache: "no-store", signal: AbortSignal.timeout(5000) },
          );
          if (res.ok) {
            const data = (await res.json()) as { scope?: string };
            if (data?.scope) {
              const liveScopes = extractScopeTokens(data.scope);
              const liveHasCalendar =
                liveScopes.has("https://www.googleapis.com/auth/calendar.events.owned") ||
                liveScopes.has("https://www.googleapis.com/auth/calendar") ||
                liveScopes.has("https://www.googleapis.com/auth/calendar.events");
              const liveHasDrive =
                liveScopes.has("https://www.googleapis.com/auth/drive.readonly") ||
                liveScopes.has("https://www.googleapis.com/auth/drive");

              if (liveHasCalendar) hasCalendar = true;
              if (liveHasDrive) hasDrive = true;

              // Persist live merged scopes back into MongoDB account document
              const merged = Array.from(
                new Set([...extractScopeTokens(dbScope), ...liveScopes]),
              ).join(" ");
              await db.collection("account").updateOne(
                { _id: accountDoc._id },
                { $set: { scope: merged, updatedAt: new Date() } },
              );
            }
          }
        } catch {
          // If tokeninfo network check fails, fallback to current flags
        }
      }

      return {
        googleAccount: primary,
        hasCalendarScope: hasCalendar,
        hasDriveScope: hasDrive,
        accessToken,
      };
    }
  } catch {
    // Fallback if DB direct lookup fails
  }

  const token = primary ? await getGoogleAccessToken(primary.id, requestHeaders) : null;
  return {
    googleAccount: primary,
    hasCalendarScope: hasCalendar,
    hasDriveScope: hasDrive,
    accessToken: token,
  };
}

