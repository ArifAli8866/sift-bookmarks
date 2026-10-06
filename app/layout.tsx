import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter/opsz.css";
import "./globals.css";
import "./shell.css";
import "./library.css";
import "./overlays.css";

export const metadata: Metadata = {
  title: {
    default: "Sift — bookmarks for developers",
    template: "%s · Sift",
  },
  description:
    "A keyboard-first place for the links you keep losing: collections, favourites, manual ordering and a command palette.",
  applicationName: "Sift",
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
      </head>
      <body>{children}</body>
    </html>
  );
}
