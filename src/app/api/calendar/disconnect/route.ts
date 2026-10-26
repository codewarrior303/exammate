import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isTrustedMutationRequest, getClientIp, checkPersistentRateLimit } from "@/lib/api-security";

export async function POST(request: Request) {
  if (!isTrustedMutationRequest(request)) {
    return NextResponse.json({ error: "Request origin is not allowed." }, { status: 403 });
  }

  const clientIp = getClientIp(request);
  try {
    const rateLimit = await checkPersistentRateLimit(`calendar_disconnect:${clientIp}`, 10, 60 * 1000);
    if (!rateLimit.allowed) {
      return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
    }
  } catch {
    // continue if persistent store has a momentary error
  }

  try {
    const requestHeaders = await headers();
    const session = await auth.api.getSession({ headers: requestHeaders });
    if (!session) {
      return NextResponse.json({ error: "A valid session is required to disconnect Google." }, { status: 401 });
    }

    const accounts = await auth.api.listUserAccounts({ headers: requestHeaders });
    const googleAccount = accounts.find((account) => account.providerId === "google");
    if (googleAccount) {
      try {
        const token = await auth.api.getAccessToken({
          body: { accountId: googleAccount.id },
          headers: requestHeaders,
        });
        if (token?.accessToken) {
          await fetch("https://oauth2.googleapis.com/revoke", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({ token: token.accessToken }),
            signal: AbortSignal.timeout(5_000),
          });
        }
      } catch {
        // Even if the token was expired or Google is unreachable, unlink locally.
      }

      // Revoking Google's token alone leaves the Better Auth account connected.
      await auth.api.unlinkAccount({
        body: { accountId: googleAccount.id },
        headers: requestHeaders,
      });
    }

    return NextResponse.json({ disconnected: true });
  } catch {
    return NextResponse.json(
      { error: "The server could not disconnect Google. Check the auth and database setup, then try again." },
      { status: 503 }
    );
  }
}
