import type { SVGProps } from "react";

/**
 * A single, coherent icon set drawn on a 24px grid with a 1.6 stroke.
 * No emoji, no mixed weights, no filled blobs — everything shares one
 * optical size so rows and buttons stay aligned.
 */
export type IconName =
  | "star"
  | "plus"
  | "search"
  | "grid"
  | "list"
  | "sort"
  | "check"
  | "close"
  | "chevronDown"
  | "chevronRight"
  | "chevronUp"
  | "link"
  | "inbox"
  | "clock"
  | "book"
  | "wrench"
  | "briefcase"
  | "swatch"
  | "code"
  | "folder"
  | "grip"
  | "ellipsis"
  | "pencil"
  | "trash"
  | "external"
  | "sun"
  | "moon"
  | "auto"
  | "sidebar"
  | "keyboard"
  | "tag"
  | "arrowUp"
  | "arrowDown"
  | "command"
  | "bookmark"
  | "sparkle"
  | "user"
  | "logout"
  | "settings"
  | "google"
  | "bot"
  | "database"
  | "cloud"
  | "terminal"
  | "globe"
  | "layers"
  | "copy"
  | "checkCircle";

type Props = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 16, children, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

/** Star is the one glyph that needs a filled variant. */
function Star({ filled, ...rest }: Props & { filled?: boolean }) {
  return (
    <Svg {...rest}>
      <path
        d="M12 3.6l2.5 5.06 5.58.8-4.04 3.94.95 5.56L12 16.36l-4.99 2.6.95-5.56L3.92 9.46l5.58-.8L12 3.6z"
        fill={filled ? "currentColor" : "none"}
        strokeWidth={filled ? 1.1 : 1.6}
      />
    </Svg>
  );
}

export function Icon({ name, filled, ...rest }: Props & { name: IconName; filled?: boolean }) {
  switch (name) {
    case "star":
      return <Star {...rest} filled={filled} />;
    case "plus":
      return (
        <Svg {...rest}>
          <path d="M12 5.5v13M5.5 12h13" />
        </Svg>
      );
    case "search":
      return (
        <Svg {...rest}>
          <circle cx="10.75" cy="10.75" r="6.25" />
          <path d="M15.4 15.4L20 20" />
        </Svg>
      );
    case "grid":
      return (
        <Svg {...rest}>
          <rect x="4.5" y="4.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="13" y="4.5" width="6.5" height="6.5" rx="1.5" />
          <rect x="4.5" y="13" width="6.5" height="6.5" rx="1.5" />
          <rect x="13" y="13" width="6.5" height="6.5" rx="1.5" />
        </Svg>
      );
    case "list":
      return (
        <Svg {...rest}>
          <path d="M5 7h14M5 12h14M5 17h14" />
        </Svg>
      );
    case "sort":
      return (
        <Svg {...rest}>
          <path d="M8 6v12M5 9l3-3 3 3M16 18V6M13 15l3 3 3-3" />
        </Svg>
      );
    case "check":
      return (
        <Svg {...rest}>
          <path d="M5.5 12.5l4.5 4.5 9-9" />
        </Svg>
      );
    case "checkCircle":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="9" />
          <path d="M8.5 12.5l2.5 2.5 5-5" />
        </Svg>
      );
    case "close":
      return (
        <Svg {...rest}>
          <path d="M6 6l12 12M18 6L6 18" />
        </Svg>
      );
    case "chevronDown":
      return (
        <Svg {...rest}>
          <path d="M6.5 9.5l5.5 5.5 5.5-5.5" />
        </Svg>
      );
    case "chevronRight":
      return (
        <Svg {...rest}>
          <path d="M9.5 6.5l5.5 5.5-5.5 5.5" />
        </Svg>
      );
    case "chevronUp":
      return (
        <Svg {...rest}>
          <path d="M6.5 14.5l5.5-5.5 5.5 5.5" />
        </Svg>
      );
    case "link":
      return (
        <Svg {...rest}>
          <path d="M10.1 14a3.6 3.6 0 005.3.4l2.4-2.4a3.6 3.6 0 00-5.1-5.1l-1.2 1.2" />
          <path d="M13.9 10a3.6 3.6 0 00-5.3-.4L6.2 12a3.6 3.6 0 005.1 5.1l1.2-1.2" />
        </Svg>
      );
    case "inbox":
      return (
        <Svg {...rest}>
          <path d="M4 13.5L6 5.5h12l2 8v5H4v-5z" />
          <path d="M4 13.5h4.2l1 2.2h5.6l1-2.2H20" />
        </Svg>
      );
    case "clock":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 7.8V12l3 1.9" />
        </Svg>
      );
    case "book":
      return (
        <Svg {...rest}>
          <path d="M4.5 5.5h6a2.5 2.5 0 012.5 2.5v10.5a2 2 0 00-2-2h-6.5z" />
          <path d="M19.5 5.5H13A2.5 2.5 0 0010.5 8v10.5a2 2 0 012-2h7z" />
        </Svg>
      );
    case "wrench":
      return (
        <Svg {...rest}>
          <path d="M14.5 6.5a3.6 3.6 0 014.9 4.5l1.6 1.6-2.6 2.6-1.6-1.6a3.6 3.6 0 01-4.5-4.9" />
          <path d="M12.3 10.7L4.8 18.2l1.6 1.6 7.5-7.5" />
        </Svg>
      );
    case "briefcase":
      return (
        <Svg {...rest}>
          <path d="M4.5 8.5h15v10.5h-15z" />
          <path d="M9 8.5V6.2h6v2.3M4.5 13.2h15" />
        </Svg>
      );
    case "swatch":
      return (
        <Svg {...rest}>
          <path d="M11 4.5l8.5 8.5-6.4 6.4a2 2 0 01-2.8 0L4.6 13.7a2 2 0 010-2.8z" />
          <path d="M8.2 8.2l1.6 1.6M11.4 11.4l1.6 1.6" />
        </Svg>
      );
    case "code":
      return (
        <Svg {...rest}>
          <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
        </Svg>
      );
    case "folder":
      return (
        <Svg {...rest}>
          <path d="M4.5 6.5h5l1.6 2h8.4v10.5h-15z" />
        </Svg>
      );
    case "grip":
      return (
        <Svg {...rest} strokeWidth={0} fill="currentColor">
          <circle cx="9.5" cy="6.5" r="1.35" />
          <circle cx="14.5" cy="6.5" r="1.35" />
          <circle cx="9.5" cy="12" r="1.35" />
          <circle cx="14.5" cy="12" r="1.35" />
          <circle cx="9.5" cy="17.5" r="1.35" />
          <circle cx="14.5" cy="17.5" r="1.35" />
        </Svg>
      );
    case "ellipsis":
      return (
        <Svg {...rest} strokeWidth={0} fill="currentColor">
          <circle cx="6" cy="12" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="18" cy="12" r="1.5" />
        </Svg>
      );
    case "pencil":
      return (
        <Svg {...rest}>
          <path d="M4.8 19.2l.6-3.4 9.6-9.6 2.8 2.8-9.6 9.6z" />
          <path d="M13.6 7.4l2.8 2.8" />
        </Svg>
      );
    case "trash":
      return (
        <Svg {...rest}>
          <path d="M5.5 7.5h13M9.5 7.5V5.8h5v1.7M7 7.5l.9 11h8.2l.9-11" />
          <path d="M10.6 10.8v4.6M13.4 10.8v4.6" />
        </Svg>
      );
    case "external":
      return (
        <Svg {...rest}>
          <path d="M13.5 5.5H19v5.5M19 5.5l-7 7" />
          <path d="M17.2 13.2v5.3H6.5V7.5h5.3" />
        </Svg>
      );
    case "sun":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3.5v2M12 18.5v2M3.5 12h2M18.5 12h2M6 6l1.4 1.4M16.6 16.6L18 18M18 6l-1.4 1.4M7.4 16.6L6 18" />
        </Svg>
      );
    case "moon":
      return (
        <Svg {...rest}>
          <path d="M19 14.2a7.6 7.6 0 01-9.4-9.4 7.5 7.5 0 109.4 9.4z" />
        </Svg>
      );
    case "auto":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="7.5" />
          <path d="M12 4.5v15" />
          <path d="M12 4.5a7.5 7.5 0 010 15z" fill="currentColor" stroke="none" />
        </Svg>
      );
    case "sidebar":
      return (
        <Svg {...rest}>
          <path d="M4.5 5.5h15v13h-15z" />
          <path d="M9.8 5.5v13" />
        </Svg>
      );
    case "keyboard":
      return (
        <Svg {...rest}>
          <path d="M3.5 7.5h17v9h-17z" />
          <path d="M6.4 10.6h.01M9.4 10.6h.01M12.4 10.6h.01M15.4 10.6h.01M17.6 10.6h.01M8 13.6h8" />
        </Svg>
      );
    case "tag":
      return (
        <Svg {...rest}>
          <path d="M11.2 4.5H19v7.8l-7.3 7.3a1.6 1.6 0 01-2.3 0l-5.5-5.5a1.6 1.6 0 010-2.3z" />
          <circle cx="15.4" cy="8.4" r="1.1" />
        </Svg>
      );
    case "arrowUp":
      return (
        <Svg {...rest}>
          <path d="M12 19V5M12 5l-5 5M12 5l5 5" />
        </Svg>
      );
    case "arrowDown":
      return (
        <Svg {...rest}>
          <path d="M12 5v14M12 19l-5-5M12 19l5-5" />
        </Svg>
      );
    case "command":
      return (
        <Svg {...rest}>
          <path d="M8.4 5.4a2.4 2.4 0 10-2.4 2.4h12a2.4 2.4 0 102.4-2.4v13.2a2.4 2.4 0 11-2.4-2.4H6a2.4 2.4 0 11-2.4 2.4V5.4" />
        </Svg>
      );
    case "bookmark":
      return (
        <Svg {...rest}>
          <path d="M6.5 4.8h11v14.4l-5.5-3.7-5.5 3.7z" />
        </Svg>
      );
    case "sparkle":
      return (
        <Svg {...rest}>
          <path d="M12 4.5l1.7 4.3 4.3 1.7-4.3 1.7L12 16.5l-1.7-4.3L6 10.5l4.3-1.7z" />
          <path d="M18.4 16.2l.7 1.7 1.7.7-1.7.7-.7 1.7-.7-1.7-1.7-.7 1.7-.7z" />
        </Svg>
      );
    case "user":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="8" r="4" />
          <path d="M5.5 19.5a6.5 6.5 0 0113 0" />
        </Svg>
      );
    case "logout":
      return (
        <Svg {...rest}>
          <path d="M9 20H5.5A1.5 1.5 0 014 18.5v-13A1.5 1.5 0 015.5 4H9M15 16l4-4-4-4M19 12H9" />
        </Svg>
      );
    case "settings":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
        </Svg>
      );
    case "bot":
      return (
        <Svg {...rest}>
          <rect x="4" y="8" width="16" height="12" rx="2" />
          <path d="M12 4v4M8 13h.01M16 13h.01M9 17h6" />
        </Svg>
      );
    case "database":
      return (
        <Svg {...rest}>
          <ellipse cx="12" cy="5.5" rx="8" ry="3" />
          <path d="M4 5.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6M4 11.5v6c0 1.66 3.58 3 8 3s8-1.34 8-3v-6" />
        </Svg>
      );
    case "cloud":
      return (
        <Svg {...rest}>
          <path d="M17.5 19H6.2a4.2 4.2 0 01-.6-8.4 5.5 5.5 0 0110.8-2 4 4 0 014.1 4.4A3.5 3.5 0 0117.5 19z" />
        </Svg>
      );
    case "terminal":
      return (
        <Svg {...rest}>
          <polyline points="4 17 10 11 4 5" />
          <line x1="12" y1="19" x2="20" y2="19" />
        </Svg>
      );
    case "globe":
      return (
        <Svg {...rest}>
          <circle cx="12" cy="12" r="9" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <path d="M12 3a14.5 14.5 0 010 18M12 3a14.5 14.5 0 000 18" />
        </Svg>
      );
    case "layers":
      return (
        <Svg {...rest}>
          <polygon points="12 3 3 8 12 13 21 8 12 3" />
          <path d="M3 13l9 5 9-5M3 18l9 5 9-5" />
        </Svg>
      );
    case "copy":
      return (
        <Svg {...rest}>
          <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
          <path d="M5 15.5H4.5a1.5 1.5 0 01-1.5-1.5V4.5A1.5 1.5 0 014.5 3H14a1.5 1.5 0 011.5 1.5v.5" />
        </Svg>
      );
    case "google":
      return (
        <svg
          width={rest.size || 16}
          height={rest.size || 16}
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      );
  }
}
