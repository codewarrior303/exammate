import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./global.css";
import { WebsiteLoader } from "./website-loader";
import { RouteLoadingOverlay } from "./route-loading-overlay";
import { PwaRegistration } from "./pwa-registration";
import { headers } from "next/headers";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  preload: false,
});

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
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.webmanifest" />
        <link rel="icon" href="/icon.svg?v=2" type="image/svg+xml" />
      </head>
      <body className={`${plusJakartaSans.variable} ${inter.variable} ${jetBrainsMono.variable}`}>
        {/* Browsers intentionally hide nonce attributes from HTML attribute reads
            during hydration. Suppress only this expected mismatch; keep the CSP nonce. */}
        <script
          nonce={nonce}
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `(() => {
              const root = document.documentElement;
              const isReload = performance.getEntriesByType("navigation")[0]?.type === "reload";
              if (isReload) root.setAttribute("data-exammate-refresh", "true");
              window.addEventListener("pageshow", (event) => {
                if (event.persisted) root.removeAttribute("data-exammate-refresh");
              });
            })();`,
          }}
        />
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
