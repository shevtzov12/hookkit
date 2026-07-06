import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { IBM_Plex_Mono, Instrument_Sans } from "next/font/google";
import { CookieNotice } from "@/components/legal/cookie-notice";
import { TermlyCMP } from "@/components/legal/termly-cmp";
import { isClerkEnabled } from "@/lib/auth/config";
import { getTermlyWebsiteUuid } from "@/lib/termly/config";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "HookKit — Webhooks + Forms",
  description:
    "API-first webhook inbox and form backend for static sites. No AI. No server required on the client side.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const useTermlyCmp = Boolean(getTermlyWebsiteUuid());

  const body = (
    <body className="h-full antialiased">
      <TermlyCMP />
      {!useTermlyCmp ? <CookieNotice /> : null}
      {children}
    </body>
  );

  return (
    <html lang="en" className={`${instrumentSans.variable} ${ibmPlexMono.variable} h-full`}>
      {isClerkEnabled() ? <ClerkProvider>{body}</ClerkProvider> : body}
    </html>
  );
}
