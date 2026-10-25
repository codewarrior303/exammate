import { isIP } from "node:net";

function parseIpHeader(value: string | null): string | null {
  if (!value) return null;

  // Forwarded-for headers can contain a proxy chain. The first value is the
  // original client only when the hosting platform has normalized the header.
  const candidate = value.split(",", 1)[0].trim();
  return isIP(candidate) ? candidate : null;
}

/**
 * Read the client IP from headers normalized by the hosting proxy.
 * Vercel Verified Proxy supports Cloudflare's CF-Connecting-IP header; the
 * Vercel-generated header is the fallback for direct Vercel requests.
 */
export function getClientIp(request: Pick<Request, "headers">): string {
  const headers = request.headers;
  return (
    parseIpHeader(headers.get("cf-connecting-ip")) ??
    parseIpHeader(headers.get("x-vercel-forwarded-for")) ??
    parseIpHeader(headers.get("x-forwarded-for")) ??
    parseIpHeader(headers.get("x-real-ip")) ??
    "unknown"
  );
}
