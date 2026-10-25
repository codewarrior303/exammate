import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import type { Metadata, Viewport } from "next";
import "./global.css";
import { WebsiteLoader } from "./website-loader";
import { RouteLoadingOverlay } from "./route-loading-overlay";
import { PwaRegistration } from "./pwa-registration";
import { headers } from "next/headers";

export const viewport: Viewport = {
  themeColor: "#0A1118",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "ExamMate | Build your exam table in minutes",
  applicationName: "ExamMate",
  appleWebApp: {
    capable: true,
    title: "ExamMate",
    statusBarStyle: "black-translucent",
  },
  description:
    "Find your exact exam dates and times from the official university routine. Export a clean schedule or sync with Google Calendar in seconds.",
  icons: {
    icon: "/icon.svg?v=2",
    shortcut: "/icon.svg?v=2",
    apple: "/icons/exammate-180.png",
  },
  verification: {
    google: "aWAddGqb93o49xZGCVOnpxy77vk6BI0MW3Yo7cj-6tU",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // The middleware issues a fresh CSP nonce per request. Reading request
  // headers opts this layout into dynamic rendering so Next.js can attach that
  // nonce to its inline bootstrap scripts instead of caching nonce-less HTML.
  await headers();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg?v=2" type="image/svg+xml" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap"
        />
      </head>
      <body>
        <PwaRegistration />
        <WebsiteLoader />
        <RouteLoadingOverlay />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
