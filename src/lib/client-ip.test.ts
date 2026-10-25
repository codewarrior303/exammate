import assert from "node:assert/strict";
import test from "node:test";
import { getClientIp } from "./client-ip";

test("prefers Vercel-verified Cloudflare client IP", () => {
  const request = new Request("https://exammate.triizync.com", {
    headers: {
      "cf-connecting-ip": "198.51.100.23",
      "x-vercel-forwarded-for": "203.0.113.9",
    },
  });

  assert.equal(getClientIp(request), "198.51.100.23");
});

test("uses Vercel's forwarded IP when Cloudflare header is absent", () => {
  const request = new Request("https://exammate.triizync.com", {
    headers: { "x-vercel-forwarded-for": "2001:db8::1, 192.0.2.8" },
  });

  assert.equal(getClientIp(request), "2001:db8::1");
});

test("ignores malformed IP headers and returns a stable fallback", () => {
  const request = new Request("https://exammate.triizync.com", {
    headers: {
      "cf-connecting-ip": "attacker-controlled-value",
      "x-vercel-forwarded-for": "not-an-ip",
      "x-forwarded-for": "also-not-an-ip",
      "x-real-ip": "",
    },
  });

  assert.equal(getClientIp(request), "unknown");
});

test("falls back to a valid normalized forwarded-for IP", () => {
  const request = new Request("https://exammate.triizync.com", {
    headers: { "x-forwarded-for": "192.0.2.45, 198.51.100.4" },
  });

  assert.equal(getClientIp(request), "192.0.2.45");
});
