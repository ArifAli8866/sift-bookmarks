import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/opsz.css";
import "./globals.css";
import "./shell.css";
import "./library.css";
import "./overlays.css";

export const metadata: Metadata = {
  title: {
    default: "Sift — Bookmarks for Developers",
    template: "%s · Sift",
  },
  description:
    "A keyboard-first bookmark manager for developers: collections, favourites, manual ordering, and an instant command palette.",
  applicationName: "Sift",
  icons: {
    icon: [
      { url: "/favicon.svg?v=2", type: "image/svg+xml", sizes: "any" },
      { url: "/favicon-32x32.png?v=2", type: "image/png", sizes: "32x32" },
      { url: "/favicon-16x16.png?v=2", type: "image/png", sizes: "16x16" },
      { url: "/favicon.ico?v=2", sizes: "any" },
    ],
    shortcut: [{ url: "/favicon.ico?v=2" }],
    apple: [{ url: "/apple-touch-icon.png?v=2", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/site.webmanifest",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0e10" },
  ],
};

/** Runs before first paint so the chosen appearance never flashes. */
const APPEARANCE_BOOTSTRAP = `try{var p=JSON.parse(localStorage.getItem('sift.prefs.v1')||'{}');if(p.theme==='light'||p.theme==='dark'){document.documentElement.setAttribute('data-theme',p.theme);document.documentElement.style.colorScheme=p.theme}}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: APPEARANCE_BOOTSTRAP }} />
        <script src="https://accounts.google.com/gsi/client" async defer />
      </head>
      <body>{children}</body>
    </html>
  );
}
