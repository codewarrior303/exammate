import "server-only";
import { auth } from "@/lib/auth";

/** Resolve the OAuth account that matches the signed-in Google identity. */
export async function getGoogleAccountForEmail(
  accounts: Awaited<ReturnType<typeof auth.api.listUserAccounts>>,
  email: string,
  requestHeaders: Headers,
) {
  const expectedEmail = email.trim().toLowerCase();
  for (const account of accounts ?? []) {
    if (account.providerId !== "google") continue;
    try {
      const token = await auth.api.getAccessToken({
        body: { accountId: account.id },
        headers: requestHeaders,
      });
      if (!token?.accessToken) continue;
      const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
        headers: { Authorization: `Bearer ${token.accessToken}` },
        signal: AbortSignal.timeout(8_000),
        cache: "no-store",
      });
      if (!response.ok) continue;
      const profile = await response.json() as { email?: string };
      if (profile.email?.trim().toLowerCase() === expectedEmail) {
        return { account, accessToken: token.accessToken };
      }
    } catch {
      // Try other linked accounts without exposing tokens or provider errors.
    }
  }
  return null;
}
